; QuickerUse NSIS 安装向导
; 页面顺序: 欢迎页 → 密码验证 → 协议 → 安装目录
;
; electron-builder assistedInstaller.nsh 页面顺序:
; 1. customWelcomePage (如果定义)
; 2. licensePage (如果定义)
; 3. 安装模式选择 (PAGE_INSTALL_MODE)
; 4. 目录选择 (如果 allowToChangeInstallationDirectory)
; 5. 安装
; 6. 完成

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; 禁用未引用函数的警告
!pragma warning disable 6010

; ========== 变量定义 ==========
Var hPasswordDialog
Var hPasswordInput
Var hPasswordLabel
Var hPasswordHint
Var PasswordVerified

; ========== 密码验证页面函数 ==========
!macro customHeader
  Function PagePassword
    ; 检查是否已验证过密码
    ${If} $PasswordVerified == "1"
      Abort
    ${EndIf}

    ; 检查是否为 UAC 内部实例 (权限提升后的重启)
    ${If} ${UAC_IsInnerInstance}
      StrCpy $PasswordVerified "1"
      Abort
    ${EndIf}

    ; 创建自定义对话框
    nsDialogs::Create 1018
    Pop $hPasswordDialog
    ${If} $hPasswordDialog == error
      Abort
    ${EndIf}

    ; 设置页面标题样式
    ${NSD_CreateLabel} 0 0 100% 20u "安装密码验证"
    Pop $hPasswordLabel
    CreateFont $0 "Microsoft YaHei UI" 12 700
    SendMessage $hPasswordLabel ${WM_SETFONT} $0 0

    ; 副标题说明
    ${NSD_CreateLabel} 0 25u 100% 16u "此程序需要验证安装密码才能继续安装。"
    Pop $0

    ; 提示信息
    ${NSD_CreateLabel} 0 45u 100% 16u "如果您没有密码，请联系软件提供者获取。"
    Pop $0

    ; 密码标签
    ${NSD_CreateLabel} 0 75u 70u 14u "安装密码："
    Pop $0

    ; 密码输入框
    ${NSD_CreatePassword} 75u 73u 200u 16u ""
    Pop $hPasswordInput

    ; 密码提示
    ${NSD_CreateLabel} 0 100u 100% 14u "* 密码区分大小写"
    Pop $hPasswordHint

    nsDialogs::Show
  FunctionEnd

  Function PagePasswordLeave
    ; 获取输入的密码
    ${NSD_GetText} $hPasswordInput $0

    ; 检查是否为空
    ${If} $0 == ""
      MessageBox MB_OK|MB_ICONEXCLAMATION "请输入安装密码！"
      Abort
    ${EndIf}

    ; 验证密码
    ${If} $0 != "Neu8566"
      MessageBox MB_OK|MB_ICONSTOP "密码错误！$\n$\n请输入正确的安装密码。"
      Abort
    ${EndIf}

    ; 标记密码已验证
    StrCpy $PasswordVerified "1"
  FunctionEnd

  ; 欢迎页跳过函数 (UAC重启时跳过欢迎页)
  Function SkipWelcomeIfUAC
    ${If} ${UAC_IsInnerInstance}
      Abort
    ${EndIf}
  FunctionEnd

  ; 协议页跳过函数 (UAC重启时跳过协议页)
  Function SkipLicenseIfUAC
    ${If} ${UAC_IsInnerInstance}
      Abort
    ${EndIf}
  FunctionEnd
!macroend

; ========== 初始化 ==========
!macro customInit
  StrCpy $PasswordVerified "0"
!macroend

; ========== 1. 欢迎页 (UAC重启时跳过) ==========
!macro customWelcomePage
  !define MUI_PAGE_CUSTOMFUNCTION_PRE SkipWelcomeIfUAC
  !insertmacro MUI_PAGE_WELCOME
!macroend

; ========== 2. 密码页 + 协议页 ==========
!macro licensePage
  ; 先显示密码验证页 (UAC重启时跳过，在PagePassword函数中处理)
  Page custom PagePassword PagePasswordLeave
  ; 再显示协议页 (UAC重启时跳过)
  !undef MUI_PAGE_CUSTOMFUNCTION_PRE
  !define MUI_PAGE_CUSTOMFUNCTION_PRE SkipLicenseIfUAC
  !insertmacro MUI_PAGE_LICENSE "${PROJECT_DIR}\resources\license.txt"
!macroend
