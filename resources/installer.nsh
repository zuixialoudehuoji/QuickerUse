; QuickerUse NSIS Installer - Native Password Page

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; 禁用未引用函数的警告
!pragma warning disable 6010

Var hPasswordDialog
Var hPasswordInput

; 在 customHeader 中定义函数（脚本级别）
!macro customHeader
  Function PagePassword
    nsDialogs::Create 1018
    Pop $hPasswordDialog
    ${If} $hPasswordDialog == error
      Abort
    ${EndIf}

    ; 标题提示
    ${NSD_CreateLabel} 0 0 100% 24u "此程序需要验证安装密码才能继续。"
    Pop $0

    ; 副标题
    ${NSD_CreateLabel} 0 28u 100% 16u "如果您没有密码，请联系软件提供者获取。"
    Pop $0

    ; 密码标签
    ${NSD_CreateLabel} 0 60u 70u 14u "安装密码："
    Pop $0

    ; 密码输入框
    ${NSD_CreatePassword} 75u 58u 180u 14u ""
    Pop $hPasswordInput

    ; 提示信息
    ${NSD_CreateLabel} 0 85u 100% 14u "* 密码区分大小写"
    Pop $0

    nsDialogs::Show
  FunctionEnd

  Function PagePasswordLeave
    ${NSD_GetText} $hPasswordInput $0

    ${If} $0 == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "请输入安装密码！"
      Abort
    ${EndIf}

    ${If} $0 != "quicker2024"
      MessageBox MB_OK|MB_ICONSTOP "密码错误！请重新输入正确的密码。"
      Abort
    ${EndIf}
  FunctionEnd
!macroend

; 在欢迎页后插入密码页
!macro customWelcomePage
  Page custom PagePassword PagePasswordLeave
!macroend
