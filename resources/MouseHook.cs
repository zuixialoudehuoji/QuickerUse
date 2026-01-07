using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Threading;

class Program
{
    private const int WH_MOUSE_LL = 14;
    private const int WM_MBUTTONDOWN = 0x0207;
    private const int WM_RBUTTONDOWN = 0x0204;
    private const int WM_RBUTTONUP = 0x0205;
    private const int WM_MOUSEMOVE = 0x0200;

    private static LowLevelMouseProc _proc = HookCallback;
    private static IntPtr _hookID = IntPtr.Zero;

    // 右键长按检测
    private static bool _rightButtonDown = false;
    private static DateTime _rightButtonDownTime;
    private static System.Threading.Timer _longPressTimer;
    private static bool _longPressTriggered = false;
    private static int _initialX, _initialY;
    private static int _longPressDelay = 400; // 默认400ms，可通过参数修改

    public static void Main(string[] args)
    {
        // 解析命令行参数获取长按延时
        if (args.Length > 0)
        {
            int delay;
            if (int.TryParse(args[0], out delay))
            {
                _longPressDelay = Math.Max(200, Math.Min(delay, 2000)); // 限制200-2000ms
            }
        }

        _hookID = SetHook(_proc);
        Application.Run();
        UnhookWindowsHookEx(_hookID);
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
            MSLLHOOKSTRUCT hookStruct = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT));

            // 中键点击
            if (msg == WM_MBUTTONDOWN)
            {
                Console.WriteLine("MIDDLE_CLICK");
            }
            // 右键按下
            else if (msg == WM_RBUTTONDOWN)
            {
                _rightButtonDown = true;
                _rightButtonDownTime = DateTime.Now;
                _longPressTriggered = false;
                _initialX = hookStruct.pt.x;
                _initialY = hookStruct.pt.y;

                // 启动长按定时器
                DisposeTimer();
                _longPressTimer = new System.Threading.Timer(OnLongPressTimer, null, _longPressDelay, Timeout.Infinite);
            }
            // 右键释放
            else if (msg == WM_RBUTTONUP)
            {
                DisposeTimer();
                _rightButtonDown = false;
            }
            // 鼠标移动 - 如果移动距离过大，取消长按检测
            else if (msg == WM_MOUSEMOVE && _rightButtonDown && !_longPressTriggered)
            {
                int dx = Math.Abs(hookStruct.pt.x - _initialX);
                int dy = Math.Abs(hookStruct.pt.y - _initialY);
                if (dx > 10 || dy > 10) // 移动超过10像素取消长按
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
            // 输出长按事件和坐标
            Console.WriteLine(String.Format("RIGHT_LONG_PRESS {0} {1}", _initialX, _initialY));
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
