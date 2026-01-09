using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.NetworkInformation;
using System.Security.Cryptography;
using System.Text;

namespace MacSecurity
{
    public class CryptoManager
    {
        // Internal Salt/Key components
        private static readonly string SALT = "zuixianloudehuoji";
        // 32 bytes for AES-256
        private static readonly byte[] KEY = SHA256.Create().ComputeHash(Encoding.UTF8.GetBytes(SALT + "SecretKey2026"));
        // 16 bytes for AES IV
        private static readonly byte[] IV = MD5.Create().ComputeHash(Encoding.UTF8.GetBytes(SALT + "InitVector"));

        /// <summary>
        /// Retrieves all active MAC addresses (Wireless/Ethernet).
        /// </summary>
        public static List<string> GetLocalMacAddresses()
        {
            var macs = new List<string>();
            try
            {
                foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
                {
                    // Filter for valid physical interfaces (Ethernet or Wireless)
                    if (nic.NetworkInterfaceType == NetworkInterfaceType.Ethernet || 
                        nic.NetworkInterfaceType == NetworkInterfaceType.Wireless80211)
                    {
                        string mac = nic.GetPhysicalAddress().ToString();
                        if (!string.IsNullOrEmpty(mac) && mac.Length >= 12)
                        {
                            macs.Add(mac);
                        }
                    }
                }
            }
            catch { }
            return macs.Distinct().ToList();
        }

        /// <summary>
        /// Generates an encrypted license string valid until the specified date.
        /// </summary>
        public static string GenerateLicense(DateTime expiryDate)
        {
            // Current validation: Check if we are allowed to generate (e.g., source limit)
            // For this demo, we assume the generator itself has an expiration check in the UI or Bridge.
            
            var macs = GetLocalMacAddresses();
            if (macs.Count == 0) throw new Exception("No valid network adapters found.");

            // Format: VALID_MACS|EXPIRY_TICKS|SALT
            string macList = string.Join(",", macs);
            string payload = string.Format("{0}|{1}|{2}", macList, expiryDate.Ticks, SALT);

            return EncryptString(payload);
        }

        /// <summary>
        /// Decrypts and validates the license string.
        /// Returns validity status and expiration date if valid.
        /// </summary>
        public static bool ValidateLicense(string encryptedLicense, out DateTime expiryDate, out string message)
        {
            expiryDate = DateTime.MinValue;
            try
            {
                string decrypted = DecryptString(encryptedLicense);
                string[] parts = decrypted.Split('|');

                if (parts.Length != 3)
                {
                    message = "Invalid license format.";
                    return false;
                }

                string authorizedMacsStr = parts[0];
                long expiryTicks = long.Parse(parts[1]);
                string licenseSalt = parts[2];

                if (licenseSalt != SALT)
                {
                    message = "Invalid license signature.";
                    return false;
                }

                // Check Expiration
                expiryDate = new DateTime(expiryTicks);
                if (DateTime.Now > expiryDate)
                {
                    message = string.Format("License expired on {0}.", expiryDate.ToShortDateString());
                    return false;
                }

                // Check MAC Address (Any authorized MAC must be present on current machine)
                // Note: The requirement is "mac address just need one to match".
                // The encrypted string contains the MACs of the machine where it was GENERATED.
                // Wait, usually a license is generated FOR a target machine. 
                // BUT, the prompt says: "acquire local mac... generate encrypted string".
                // AND "mac address just need one to match so it can be decrypted in complex network environments".
                // This implies the encrypted string bundles the creator's MACs? 
                // Or does it bind to the current machine?
                // Interpreting prompt: "Get LOCAL mac... generate string" -> Self-signed license?
                // Re-reading: "obtain local mac... plus salt... plus expiry... generate encrypted string."
                // "Simultaneously implement decryption... mac address just need one match can decrypt".
                // This sounds like a self-validation or a license bound to the machine that generated it.
                // I will implement: Check if ANY of the Current Machine's MACs are in the License's MAC list.
                
                var currentMacs = GetLocalMacAddresses();
                var authorizedMacs = new HashSet<string>(authorizedMacsStr.Split(','));

                bool macMatch = false;
                foreach (var mac in currentMacs)
                {
                    if (authorizedMacs.Contains(mac))
                    {
                        macMatch = true;
                        break;
                    }
                }

                if (!macMatch)
                {
                    message = "License not bound to this hardware.";
                    return false;
                }

                message = "Valid license.";
                return true;
            }
            catch (Exception)
            {
                message = "Decryption failed or invalid key.";
                return false;
            }
        }

        private static string EncryptString(string plainText)
        {
            using (Aes aes = Aes.Create())
            {
                aes.Key = KEY;
                aes.IV = IV;
                ICryptoTransform encryptor = aes.CreateEncryptor(aes.Key, aes.IV);

                using (MemoryStream ms = new MemoryStream())
                {
                    using (CryptoStream cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
                    {
                        using (StreamWriter sw = new StreamWriter(cs))
                        {
                            sw.Write(plainText);
                        }
                    }
                    return Convert.ToBase64String(ms.ToArray());
                }
            }
        }

        private static string DecryptString(string cipherText)
        {
            using (Aes aes = Aes.Create())
            {
                aes.Key = KEY;
                aes.IV = IV;
                ICryptoTransform decryptor = aes.CreateDecryptor(aes.Key, aes.IV);

                using (MemoryStream ms = new MemoryStream(Convert.FromBase64String(cipherText)))
                {
                    using (CryptoStream cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read))
                    {
                        using (StreamReader sr = new StreamReader(cs))
                        {
                            return sr.ReadToEnd();
                        }
                    }
                }
            }
        }
    }
}
