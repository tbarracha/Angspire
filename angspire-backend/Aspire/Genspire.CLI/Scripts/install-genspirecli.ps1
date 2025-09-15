<#
    install-genspirecli.ps1
    -----------------------
    • Checks whether GenspireCLI is already installed, uninstalls if present
    • Always repacks the CLI project into bin/Release
    • Extracts the correct semantic version from the .nupkg filename
    • Installs the freshly-built package from the local folder
#>

param(
    [string]$Configuration = 'Release'
)

$ErrorActionPreference = 'Stop'   # Fail fast

# --- CONFIG -------------------------------------------------------------
$PACKAGE_ID = 'GenspireCLI'       # Must match <PackageId> in .csproj
$TOOL_CMD   = 'genspire'          # <ToolCommandName>
$OUTPUT_DIR = "bin\$Configuration"

# --- POSITION TO CLI PROJECT ROOT --------------------------------------
$projectRoot = Resolve-Path "$PSScriptRoot\.."
Set-Location $projectRoot

# --- DETECT EXISTING GLOBAL TOOL ---------------------------------------
$alreadyInstalled = dotnet tool list --global |
                    Select-String -Pattern "^\s*$PACKAGE_ID\s" -Quiet

if ($alreadyInstalled) {
    Write-Host "Existing global $PACKAGE_ID detected – uninstalling …"
    dotnet tool uninstall --global $PACKAGE_ID
}
else {
    Write-Host "$PACKAGE_ID not currently installed – continuing."
}

# --- RE-PACK CLI PROJECT -----------------------------------------------
Write-Host "`nPacking project …"
Remove-Item -Recurse -Force $OUTPUT_DIR -ErrorAction SilentlyContinue | Out-Null
dotnet pack -c $Configuration -o $OUTPUT_DIR

# --- LOCATE NEW NUPKG --------------------------------------------------
$pkg = Get-ChildItem "$OUTPUT_DIR\*.nupkg" |
       Sort-Object LastWriteTime |
       Select-Object -Last 1
if (-not $pkg) { throw "No .nupkg found in $OUTPUT_DIR" }

# --- EXTRACT SEMANTIC VERSION FROM NUPKG FILENAME ----------------------
# Handles: GenspireCLI.1.2.3.nupkg, Genspire.CLI.1.2.3-preview.nupkg, etc.
if ($pkg.BaseName -match '\.(\d+\.\d+\.\d+(?:-[A-Za-z0-9\-\.]+)?)$') {
    $version = $Matches[1]
} else {
    throw "Could not determine version from package filename $($pkg.Name)"
}
Write-Host "Built package version: $version`n"

# --- INSTALL FRESH BUILD -----------------------------------------------
Write-Host "Installing $PACKAGE_ID $version …"
dotnet tool install --global $PACKAGE_ID `
                    --add-source $OUTPUT_DIR `
                    --version $version      # exact version

# --- VERIFY ------------------------------------------------------------
Write-Host "`nInstalled version:"
& $TOOL_CMD --version
