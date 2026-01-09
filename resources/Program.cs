using System;
using MacSecurity;

namespace Bridge
{
    class Program
    {
        static void Main(string[] args)
        {
            if (args.Length == 0)
            {
                Console.WriteLine("Usage: Bridge.exe [generate <days> | validate <token>]");
                return;
            }

            string command = args[0].ToLower();

            try
            {
                if (command == "generate")
                {
                    if (args.Length < 2)
                    {
                        Console.WriteLine("Error: Missing days parameter.");
                        return;
                    }
                    int days = int.Parse(args[1]);
                    
                    // Logic moved to Electron/Vue layer
                    // if (DateTime.Now > new DateTime(2026, 12, 31)) ...

                    string token = CryptoManager.GenerateLicense(DateTime.Now.AddDays(days));
                    Console.WriteLine(token);
                }
                else if (command == "validate")
                {
                    if (args.Length < 2)
                    {
                        Console.WriteLine("Error: Missing token.");
                        return;
                    }
                    string token = args[1];
                    DateTime expiry;
                    string msg;
                    bool isValid = CryptoManager.ValidateLicense(token, out expiry, out msg);
                    
                    // Simple JSON-like output for easy parsing
                    Console.WriteLine(string.Format("{{ \"valid\": {0}, \"message\": \"{1}\", \"expiry\": \"{2}\" }}", 
                        isValid.ToString().ToLower(), msg, expiry.ToString("yyyy-MM-dd HH:mm:ss")));
                }
                else
                {
                    Console.WriteLine("Error: Unknown command.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(string.Format("{{ \"valid\": false, \"message\": \"Error: {0}\" }}", ex.Message));
            }
        }
    }
}
