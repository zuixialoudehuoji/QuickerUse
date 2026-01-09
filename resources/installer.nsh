; QuickerUse NSIS 安装向导
; 简化版：欢迎页 → 安装目录 → 安装
; 密钥验证在软件启动时进行

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; 禁用未引用函数的警告
!pragma warning disable 6010

; ========== 欢迎页跳过函数 (UAC重启时跳过) ==========
!macro customHeader
  Function SkipWelcomeIfUAC
    ${If} ${UAC_IsInnerInstance}
      Abort
    ${EndIf}
  FunctionEnd
!macroend

; ========== 初始化 ==========
!macro customInit
  ; 空初始化
!macroend

; ========== 欢迎页 (UAC重启时跳过) ==========
!macro customWelcomePage
  !define MUI_PAGE_CUSTOMFUNCTION_PRE SkipWelcomeIfUAC
  !insertmacro MUI_PAGE_WELCOME
!macroend
