# Скрипт для загрузки файлов в assets релиза GitHub
# Использование: .\upload_release_assets.ps1 -Token YOUR_GITHUB_TOKEN

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [string]$Owner = "Jeredpoi",
    [string]$Repo = "khabarovskMod",
    [string]$Tag = "v0.0.1"
)

$pluginFile = "khabarovskMod.plugin.js"
$configFile = "khabarovskMod.config.json"

# Проверка наличия файлов
if (-not (Test-Path $pluginFile)) {
    Write-Error "Файл $pluginFile не найден!"
    exit 1
}

if (-not (Test-Path $configFile)) {
    Write-Error "Файл $configFile не найден!"
    exit 1
}

Write-Host "Загрузка файлов в assets релиза $Tag..." -ForegroundColor Green

# Функция для загрузки файла
function Upload-Asset {
    param(
        [string]$FilePath,
        [string]$ContentType = "application/octet-stream"
    )
    
    $fileName = Split-Path -Leaf $FilePath
    $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
    $fileEnc = [System.Text.Encoding]::GetEncoding('ISO-8859-1').GetString($fileBytes)
    $boundary = [System.Guid]::NewGuid().ToString()
    
    $LF = "`r`n"
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"$fileName`"; filename=`"$fileName`"",
        "Content-Type: $ContentType$LF",
        $fileEnc,
        "--$boundary--$LF"
    ) -join $LF
    
    $headers = @{
        "Authorization" = "token $Token"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    try {
        $response = Invoke-RestMethod -Uri "https://uploads.github.com/repos/$Owner/$Repo/releases/tags/$Tag/assets?name=$fileName" `
            -Method Post `
            -Headers $headers `
            -ContentType "multipart/form-data; boundary=$boundary" `
            -Body $bodyLines
        
        Write-Host "✅ Успешно загружен: $fileName" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Error "Ошибка при загрузке $fileName : $_"
        return $null
    }
}

# Загружаем файлы
Write-Host "Загрузка $pluginFile..." -ForegroundColor Yellow
Upload-Asset -FilePath $pluginFile -ContentType "application/javascript"

Write-Host "Загрузка $configFile..." -ForegroundColor Yellow
Upload-Asset -FilePath $configFile -ContentType "application/json"

Write-Host "`n✅ Все файлы загружены!" -ForegroundColor Green
Write-Host "Проверьте релиз: https://github.com/$Owner/$Repo/releases/tag/$Tag" -ForegroundColor Cyan
