Add-Type -AssemblyName System.Drawing

$densities = @{
    "android_build\res\mipmap-mdpi" = 48
    "android_build\res\mipmap-hdpi" = 72
    "android_build\res\mipmap-xhdpi" = 96
    "android_build\res\mipmap-xxhdpi" = 144
    "android_build\res\mipmap-xxxhdpi" = 192
}

foreach ($entry in $densities.GetEnumerator()) {
    $dir = $entry.Key
    $size = $entry.Value
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # Rounded Obsidian Rectangle
    $radius = [int]($size * 0.22)
    $diameter = $radius * 2
    $rect = New-Object System.Drawing.Rectangle 2, 2, ($size - 4), ($size - 4)
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#09090b"))
    $g.FillPath($bgBrush, $path)

    # 1px Hairline White Border
    $penBorder = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(40, 255, 255, 255)), 1.5
    $g.DrawPath($penBorder, $path)

    # Inner Chat Geometry
    $penChat = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), [float]($size * 0.05)
    $penChat.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penChat.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $penChat.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    # Scaled points for chat bubble
    $scale = $size / 100.0
    $pt1 = New-Object System.Drawing.PointF (24 * $scale), (28 * $scale)
    $pt2 = New-Object System.Drawing.PointF (76 * $scale), (28 * $scale)
    $pt3 = New-Object System.Drawing.PointF (76 * $scale), (62 * $scale)
    $pt4 = New-Object System.Drawing.PointF (48 * $scale), (62 * $scale)
    $pt5 = New-Object System.Drawing.PointF (32 * $scale), (76 * $scale)
    $pt6 = New-Object System.Drawing.PointF (36 * $scale), (62 * $scale)
    $pt7 = New-Object System.Drawing.PointF (24 * $scale), (62 * $scale)

    $chatPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $chatPath.AddLine($pt1, $pt2)
    $chatPath.AddLine($pt2, $pt3)
    $chatPath.AddLine($pt3, $pt4)
    $chatPath.AddLine($pt4, $pt5)
    $chatPath.AddLine($pt5, $pt6)
    $chatPath.AddLine($pt6, $pt7)
    $chatPath.CloseFigure()

    $g.DrawPath($penChat, $chatPath)

    # Transmission dots
    $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $dotRadius = [float]($size * 0.026)
    $dotDia = $dotRadius * 2
    $g.FillEllipse($dotBrush, (38 * $scale), (45 * $scale), $dotDia, $dotDia)
    $g.FillEllipse($dotBrush, (50 * $scale), (45 * $scale), $dotDia, $dotDia)
    $g.FillEllipse($dotBrush, (62 * $scale), (45 * $scale), $dotDia, $dotDia)

    $outFile = Join-Path $dir "ic_launcher.png"
    $bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created $outFile ($size x $size)"
}
