# DNS Diagnosis Report: Inaccessibility of `omo.dev`

An investigation of your connection to `omo.dev` reveals that your Internet Service Provider (ISP) is actively blocking the domain using **DNS hijacking (sinkholing)**. Other regions can access it because this block is specific to your ISP's network.

---

## 🔍 Diagnostic Summary

1. **Local DNS Hijacking**: Your local router/DNS server (`192.168.0.1`) resolves `omo.dev` to `103.66.222.14`. This IP belongs to **Galaxy Cable Corp. (Philippines)**.
2. **ISP Sinkhole Confirmation**: Connecting to `103.66.222.14` issues a temporary redirect to a sinkhole portal:
   `http://redirect.galaxycable.io/passthrough` with `SinkholeID: 2000264`.
3. **Correct Resolution**: Querying global public DNS servers (like Google `8.8.8.8` or Cloudflare `1.1.1.1`) returns the correct Cloudflare IPs: `104.21.58.20` and `172.67.197.56`.
4. **Bypass Verification**: Bypassing your ISP's DNS by sending requests directly to the correct Cloudflare IPs successfully establishes a secure TLS handshake and returns a standard `HTTP/2 200 OK` response.

---

## 📊 Detailed Evidence

### DNS Resolution Comparison

| DNS Server | Resolved IP Address | Status | Owner |
| :--- | :--- | :--- | :--- |
| **Local ISP DNS (`192.168.0.1`)** | `103.66.222.14` | 🛑 Blocked (Sinkholed) | Galaxy Cable Corp. (PH) |
| **Google DNS (`8.8.8.8`)** | `104.21.58.20`, `172.67.197.56` |  Allowed | Cloudflare |
| **Cloudflare DNS (`1.1.1.1`)** | `172.67.197.56`, `104.21.58.20` |  Allowed | Cloudflare |

### Sinkhole Redirect Payload
When attempting to connect to the IP resolved by your ISP, it returns a 307 redirect redirecting to the Galaxy Cable passthrough handler. The base64-encoded metadata decodes to:
```json
{
  "Method": "HEAD",
  "Scheme": "http",
  "Host": "103.66.222.14",
  "Port": "80",
  "PostData": "",
  "Path": "/",
  "Query": "{}",
  "SinkholeID": 2000264,
  "NumberOfRedirects": 0
}
```

---

## ❓ Why is it Blocked?

ISPs in the Philippines sinkhole domains for two main reasons:
1. **Regulatory Blocklists (NTC)**: The National Telecommunications Commission orders ISPs to block certain domains (frequently online gaming, gambling, copyright infringement, or adult sites). Occasionally, domains are blocked in error or because a previous owner of the domain engaged in blacklisted activities.
2. **Security Blocklists**: Your ISP's security filter may have flagged the domain as containing potential malware, phishing, or other security threats.

---

## 🛠️ How to Fix / Bypass the Block

Since the block is strictly DNS-based, you can easily bypass it by configuring your system or browser to use public DNS servers.

### Method 1: Change DNS Settings on macOS (Recommended)
This will fix the problem system-wide for all apps.

1. Open **System Settings** on your Mac.
2. Go to **Wi-Fi** (or **Network** if on Ethernet) and click **Details...** next to your active network connection.
3. Click on the **DNS** tab in the sidebar.
4. Under **DNS Servers**, click the **`+`** button and add:
   * `1.1.1.1` (Cloudflare)
   * `8.8.8.8` (Google)
5. Remove any existing ISP-provided local DNS servers if they are overriding your settings.
6. Click **OK** and then **Apply**.

To flush your DNS cache afterward, run the following in Terminal:
```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

---

### Method 2: Enable Secure DNS in your Browser
If you only want to bypass this in your web browser without changing system settings, you can enable DNS-over-HTTPS (DoH).

* **Chrome**: Settings ➔ Privacy and Security ➔ Security ➔ Use secure DNS ➔ Select **Cloudflare (1.1.1.1)** or **Google (Public DNS)**.
* **Firefox**: Settings ➔ Privacy & Security ➔ Enable **Max Protection** under *DNS over HTTPS*.

---

### Method 3: Use Cloudflare WARP or a VPN
Using a VPN or Cloudflare's free [WARP client](https://1.1.1.1/) will encrypt your DNS traffic and route your web requests around the ISP's filters.

---

### Method 4: Update `/etc/hosts` (Temporary Workaround)
If you need immediate access without changing DNS servers, you can hardcode the IP address for `omo.dev` in your hosts file:

1. Open Terminal and run:
   ```bash
   sudo nano /etc/hosts
   ```
2. Add the following line at the bottom of the file:
   ```text
   104.21.58.20 omo.dev
   ```
3. Save the file (`Ctrl + O`, then `Enter`) and exit (`Ctrl + X`).
> [!WARNING]
> This is a temporary developer workaround. Cloudflare IPs can change over time, which may break your access in the future if they update their records.
