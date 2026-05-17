!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "Starting Hermes Agent background install..."
  nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$$ErrorActionPreference=''Continue''; $$installer=Join-Path $$env:TEMP ''qarko-hermes-install.ps1''; Invoke-WebRequest -UseBasicParsing ''https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1'' -OutFile $$installer; & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $$installer -SkipSetup -NonInteractive"'
!macroend
