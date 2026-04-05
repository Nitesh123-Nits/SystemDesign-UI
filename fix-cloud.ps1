$path = "cloud-services.html"
$content = Get-Content $path -Raw -Encoding UTF8

# The file has duplicate asset block due to mixed line endings.
# Find first occurrence end position and remove the second block.
$block = "<link rel=""stylesheet"" href=""shared-guides.css"">`n<script src=""data.js"" defer></script>`n<script src=""shared-guides.js"" defer></script>"

# Remove any occurrence after the first one by splitting and rejoining
$firstIdx = $content.IndexOf('<link rel="stylesheet" href="shared-guides.css">')
$secondIdx = $content.IndexOf('<link rel="stylesheet" href="shared-guides.css">', $firstIdx + 10)

if ($secondIdx -gt 0) {
    # Find the end of the second block (after shared-guides.js line)
    $endMarker = 'shared-guides.js" defer></script>'
    $endIdx = $content.IndexOf($endMarker, $secondIdx) + $endMarker.Length
    # Also consume the trailing CRLF
    if ($content[$endIdx] -eq "`r") { $endIdx++ }
    if ($content[$endIdx] -eq "`n") { $endIdx++ }
    
    $content = $content.Substring(0, $secondIdx) + $content.Substring($endIdx)
    Set-Content $path $content -Encoding UTF8 -NoNewline
    Write-Host "Fixed: removed duplicate asset block from $path"
} else {
    Write-Host "No duplicate found in $path"
}
