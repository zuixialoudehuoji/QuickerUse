; QuickerUse NSIS 安装向导
; 页面顺序：欢迎页 → 免责协议 → 安装目录 → 安装
; 密钥验证在软件启动时进行

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; 禁用未引用函数的警告
!pragma warning disable 6010

; ========== 页面函数定义 ==========
!macro customHeader
  ; UAC 重启时跳过欢迎页
  Function SkipWelcomeIfUAC
    ${If} ${UAC_IsInnerInstance}
      Abort
    ${EndIf}
  FunctionEnd

  ; UAC 重启时跳过许可证页
  Function SkipLicenseIfUAC
    ${If} ${UAC_IsInnerInstance}
      Abort
    ${EndIf}
  FunctionEnd

  ; UAC 重启时隐藏上一步按钮（目录选择页是 UAC 后的第一页）
  Function HideBackIfUAC
    ${If} ${UAC_IsInnerInstance}
      GetDlgItem $0 $HWNDPARENT 3
      ShowWindow $0 0
    ${EndIf}
  FunctionEnd
!macroend

; ========== 初始化 ==========
!macro customInit
  ; 空初始化
!macroend

; ========== 欢迎页 ==========
!macro customWelcomePage
  !define MUI_PAGE_CUSTOMFUNCTION_PRE SkipWelcomeIfUAC
  !insertmacro MUI_PAGE_WELCOME
!macroend

; ========== 免责协议页 ==========
!macro licensePage
  !undef MUI_PAGE_CUSTOMFUNCTION_PRE
  !define MUI_PAGE_CUSTOMFUNCTION_PRE SkipLicenseIfUAC
  !insertmacro MUI_PAGE_LICENSE "${PROJECT_DIR}\resources\disclaimer.txt"
!macroend

; ========== 目录选择页配置 ==========
!macro customPageDirectory
  !undef MUI_PAGE_CUSTOMFUNCTION_PRE
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW HideBackIfUAC
!macroend
