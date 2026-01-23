using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Threading;
using System.Collections.Generic;

class Program
{
    private const int WH_MOUSE_LL = 14;
    private const int WM_MBUTTONDOWN = 0x0207;
    private const int WM_RBUTTONDOWN = 0x0204;
    private const int WM_RBUTTONUP = 0x0205;
    private const int WM_MOUSEMOVE = 0x0200;

    private static LowLevelMouseProc _proc = HookCallback;
    private static IntPtr _hookID = IntPtr.Zero;

    // Output Queue
    private static Queue<string> _outputQueue = new Queue<string>();
    private static object _queueLock = new object();
    private static AutoResetEvent _outputEvent = new AutoResetEvent(false);
    private static Thread _outputThread;
    private static volatile bool _running = true;

    // Right click long press detection
    private static bool _rightButtonDown = false;
    private static DateTime _rightButtonDownTime;
    private static System.Threading.Timer _longPressTimer;
    private static bool _longPressTriggered = false;
    private static int _initialX, _initialY;
    private static int _longPressDelay = 400;

    public static void Main(string[] args)
    {
        // Parse arguments
        if (args.Length > 0)
        {
            int delay;
            if (int.TryParse(args[0], out delay))
            {
                _longPressDelay = Math.Max(200, Math.Min(delay, 2000));
            }
        }

        // Start output thread
        _outputThread = new Thread(OutputLoop);
        _outputThread.IsBackground = true;
        _outputThread.Start();

        _hookID = SetHook(_proc);
        Application.Run();
        
        _running = false;
        _outputEvent.Set();
        UnhookWindowsHookEx(_hookID);
    }

    private static void OutputLoop()
    {
        while (_running)
        {
            _outputEvent.WaitOne();
            while (true)
            {
                string msg = null;
                lock (_queueLock)
                {
                    if (_outputQueue.Count > 0)
                    {
                        msg = _outputQueue.Dequeue();
                    }
                }

                if (msg == null) break;

                Console.WriteLine(msg);
            }
        }
    }

    private static void EnqueueOutput(string msg)
    {
        lock (_queueLock)
        {
            _outputQueue.Enqueue(msg);
        }
        _outputEvent.Set();
    }

    private static IntPtr SetHook(LowLevelMouseProc proc)
    {
        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule)
        {
            return SetWindowsHookEx(WH_MOUSE_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
        }
    }

    private delegate IntPtr LowLevelMouseProc(int nCode, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int x;
        public int y;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MSLLHOOKSTRUCT
    {
        public POINT pt;
        public uint mouseData;
        public uint flags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    private static void DisposeTimer()
    {
        if (_longPressTimer != null)
        {
            _longPressTimer.Dispose();
            _longPressTimer = null;
        }
    }

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0)
        {
            int msg = wParam.ToInt32();
            
            // Middle Click
            if (msg == WM_MBUTTONDOWN)
            {
                EnqueueOutput("MIDDLE_CLICK");
            }
            // Right Click Down
            else if (msg == WM_RBUTTONDOWN)
            {
                MSLLHOOKSTRUCT hookStruct = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT));
                _rightButtonDown = true;
                _rightButtonDownTime = DateTime.Now;
                _longPressTriggered = false;
                _initialX = hookStruct.pt.x;
                _initialY = hookStruct.pt.y;

                DisposeTimer();
                _longPressTimer = new System.Threading.Timer(OnLongPressTimer, null, _longPressDelay, Timeout.Infinite);
            }
            // Right Click Up
            else if (msg == WM_RBUTTONUP)
            {
                DisposeTimer();
                _rightButtonDown = false;
            }
            // Mouse Move
            else if (msg == WM_MOUSEMOVE && _rightButtonDown && !_longPressTriggered)
            {
                MSLLHOOKSTRUCT hookStruct = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT));
                int dx = Math.Abs(hookStruct.pt.x - _initialX);
                int dy = Math.Abs(hookStruct.pt.y - _initialY);
                if (dx > 10 || dy > 10)
                {
                    DisposeTimer();
                    _rightButtonDown = false;
                }
            }
        }
        return CallNextHookEx(_hookID, nCode, wParam, lParam);
    }

    private static void OnLongPressTimer(object state)
    {
        if (_rightButtonDown && !_longPressTriggered)
        {
            _longPressTriggered = true;
            EnqueueOutput(String.Format("RIGHT_LONG_PRESS {0} {1}", _initialX, _initialY));
        }
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelMouseProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);
}