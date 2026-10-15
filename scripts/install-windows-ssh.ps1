$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
    throw 'Run this installer in Windows PowerShell as Administrator.'
}
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Open PowerShell with Run as administrator, then run the install command again.'
}

$clientAddress = '100.81.77.115'
$publicKey = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAII3TUJOVRrdx/UWowHEjmuoP1xdHyz+r0+v6GB2TDdpF aslaii@dev-1'
$tailscale = Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe'
if (-not (Test-Path -LiteralPath $tailscale)) {
    throw 'Install and connect Tailscale before running this installer.'
}
$serverAddress = (& $tailscale ip -4 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or -not $serverAddress) {
    throw 'Tailscale has no IPv4 address. Connect it, then rerun this installer.'
}

Write-Host "Adding SSH access for this Windows administrator account, scoped to $clientAddress over Tailscale."
Write-Host 'Authorizing the public SSH key for aslaii@dev-1. No passwords or private keys are uploaded.'

$defaultRule = Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue
$capability = Get-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0'
if ($capability.State -ne 'Installed') {
    $result = Add-WindowsCapability -Online -Name 'OpenSSH.Server~~~~0.0.1.0'
    if ($result.RestartNeeded) {
        throw 'OpenSSH installation requires a Windows restart. Restart and run this installer again.'
    }
}
if (-not $defaultRule) {
    Get-NetFirewallRule -Name 'OpenSSH-Server-In-TCP' -ErrorAction SilentlyContinue | Disable-NetFirewallRule
} elseif ($defaultRule.Enabled -eq 'True') {
    Write-Warning 'An existing OpenSSH firewall rule was preserved. It may allow SSH from additional addresses.'
}

$ruleName = 'Dotfiles-SSH-Tailscale-dev-1'
$rule = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if ($rule) {
    Set-NetFirewallRule -Name $ruleName -Enabled True -Profile Any -Direction Inbound -Action Allow -Protocol TCP -LocalPort 22 -LocalAddress $serverAddress -RemoteAddress $clientAddress | Out-Null
} else {
    New-NetFirewallRule -Name $ruleName -DisplayName 'Dotfiles SSH from dev-1 over Tailscale' -Enabled True -Profile Any -Direction Inbound -Action Allow -Protocol TCP -LocalPort 22 -LocalAddress $serverAddress -RemoteAddress $clientAddress | Out-Null
}

$keyDirectory = Join-Path $env:ProgramData 'ssh'
New-Item -ItemType Directory -Path $keyDirectory -Force | Out-Null
$keyFile = Join-Path $keyDirectory 'administrators_authorized_keys'
$keys = @()
if (Test-Path -LiteralPath $keyFile) {
    $keys = @(Get-Content -LiteralPath $keyFile)
}
if ($keys -notcontains $publicKey) {
    Add-Content -LiteralPath $keyFile -Value ("`r`n" + $publicKey) -Encoding ascii
}
& icacls.exe $keyFile /inheritance:r /grant:r '*S-1-5-32-544:F' /grant:r '*S-1-5-18:F' | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw 'Could not secure the administrator SSH authorized_keys file.'
}

Set-Service -Name sshd -StartupType Automatic
Start-Service -Name sshd
if ((Get-Service -Name sshd).Status -ne 'Running') {
    throw 'The Windows SSH server did not start.'
}
$sshKeygen = Join-Path $env:WINDIR 'System32\OpenSSH\ssh-keygen.exe'
$hostKey = Join-Path $keyDirectory 'ssh_host_ed25519_key.pub'
Write-Host ''
Write-Host 'SSH is ready. Send back the username and host fingerprint below:'
& whoami.exe
& $sshKeygen -lf $hostKey
if ($LASTEXITCODE -ne 0) {
    throw 'SSH started, but its host-key fingerprint could not be read.'
}
Write-Host "Connect from the Mac: ssh -i ~/.ssh/id_ed25519 $env:USERNAME@$serverAddress"
Write-Host 'Keep Windows awake and Tailscale connected. This installs SSH only, not the Kelno build tools.'
