; QuickerUse NSIS 安装向导
; 页面顺序：欢迎页 → 免责协议 → 安装目录 → 安装
; 密钥验证在软件启动时进行

!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"

; 禁用未引用函数的警告
!pragma warning disable 6010

; 按钮 ID：上一步=3
!define BACK_BUTTON_ID 3

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
!macroend

; ========== 初始化 ==========
!macro customInit
  ; 空初始化
!macroend

; ========== GUI 初始化完成后：UAC 重启时隐藏上一步按钮 ==========
!macro customGUIInit
  ${If} ${UAC_IsInnerInstance}
    GetDlgItem $0 $HWNDPARENT ${BACK_BUTTON_ID}
    ShowWindow $0 ${SW_HIDE}
    EnableWindow $0 0
  ${EndIf}
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
