Set WshShell = CreateObject("WScript.Shell")

projectPath = Replace(WScript.ScriptFullName, WScript.ScriptName, "")

nodePath = "C:\Program Files\nodejs\node.exe"

command = """" & nodePath & """ """ & projectPath & "server.js"""

WshShell.Run command, 0, False

WScript.Sleep 5000

WshShell.Run "http://localhost:3000", 1, False