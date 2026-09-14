' Electronics Lab - silent launcher (no console window)
Set sh = CreateObject("WScript.Shell")
ps1 = "C:\Users\793\Doubao\chats\2026-09-14\new-chat\electronics-lab\start-electronics-lab.ps1"
sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & ps1 & """", 0, False
