[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [string]$DocumentPath,

  [Parameter(Mandatory = $false)]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.IO.Compression.FileSystem
$repositoryRoot = Split-Path $PSScriptRoot -Parent
if (-not $DocumentPath) { $DocumentPath = Join-Path $repositoryRoot '赛博史记1.0_截止2026年8月15日.docx' }
if (-not $OutputPath) { $OutputPath = Join-Path $repositoryRoot 'data/events.json' }

function Get-TextFromNode {
  param(
    [System.Xml.XmlNode]$Node,
    [System.Xml.XmlNamespaceManager]$NamespaceManager
  )

  $parts = $Node.SelectNodes('.//w:t', $NamespaceManager) | ForEach-Object { $_.'#text' }
  return (($parts -join '') -replace '\s+', ' ').Trim()
}

function Get-SourceInstitution {
  param([string]$Url)

  if (-not $Url) { return '《赛博史记》资料索引' }
  try {
    $host = ([Uri]$Url).Host.ToLowerInvariant()
    if ($host -match 'xinhuanet|news\.cn') { return '新华网' }
    if ($host -match 'cctv') { return '央视网' }
    if ($host -match 'cac\.gov\.cn') { return '中国网信网' }
    if ($host -match 'gov\.cn|mem\.gov\.cn|nhc\.gov\.cn|nmpa\.gov\.cn') { return '政府部门' }
    if ($host -match 'cnr\.cn') { return '央广网' }
    return $host
  }
  catch { return '公开资料' }
}

function Get-SourceMetadata {
  param(
    [string]$Url,
    [string]$Institution
  )

  if (-not $Url) {
    return @{ Rank = 5; Type = '其他'; Role = '线索'; Archive = '待补证' }
  }
  $value = "$Institution $Url"
  if ($value -match '纪委|监委|纪检') {
    return @{ Rank = 1; Type = '纪委监察'; Role = '事实依据'; Archive = '在线' }
  }
  if ($value -match '公安|警方|平安') {
    return @{ Rank = 1; Type = '公安通报'; Role = '事实依据'; Archive = '在线' }
  }
  if ($value -match 'gov\.cn|mem\.gov\.cn|应急管理部|政府部门') {
    return @{ Rank = 1; Type = '行政调查'; Role = '事实依据'; Archive = '在线' }
  }
  if ($value -match '新华|news\.cn|xinhuanet') {
    return @{ Rank = 3; Type = '新华社报道'; Role = '事实依据'; Archive = '在线' }
  }
  if ($value -match '央视|央广|人民网|cctv|cnr\.cn') {
    return @{ Rank = 4; Type = '媒体报道'; Role = '历史报道'; Archive = '在线' }
  }
  return @{ Rank = 5; Type = '其他'; Role = '线索'; Archive = '在线' }
}

function Get-EvidenceLevel {
  param([string]$Evidence)

  if ($Evidence -match '未定|争议|未证实|不足|缺|疑云|分歧|核查中') { return '强争议' }
  if ($Evidence -match '判决|法院|司法|刑事') { return '司法定案' }
  if ($Evidence -match '当事方承认|企业承认|公开承认') { return '当事人承认' }
  if ($Evidence -match '官方|国务院|公安|警方|监管|调查|问责|处罚|税务|校方|学校|教育部|网信|处置|整改|检察') { return '官方调查' }
  if ($Evidence -match '权威|多方|央视|媒体') { return '多方证实' }
  return '未核实'
}

function Get-SubjectType {
  param([string]$Text)

  if ($Text -match '大学|学院|学校|幼儿园|导师|研究生|博士生|实验室|教育') { return '学校/科研机构' }
  if ($Text -match '政府|国务院|警方|公安|监管|纪委|纪检|卫健|红十字会|调查组|公共机构') { return '公共机构' }
  if ($Text -match '企业|公司|平台|品牌|银行|公寓|航空|直播|外卖|百度|美团|阿里|滴滴') { return '企业/平台' }
  if ($Text -match '主播|网红|博主|男子|女子|学生|医生|艺人|女孩|少年|儿童|阿姨') { return '个人/群体' }
  return '公共事件'
}

function Get-Tags {
  param([string]$Text)

  $rules = [ordered]@{
    '食品安全' = '食品|食用|大米|酸菜|虾仁|月饼|燕窝|菜刀|卫生巾|纸尿裤|鹅腿|鸭腿|血铅'
    '平台责任' = '平台|算法|搜索|贴吧|直播|外卖|网信|账号'
    '数据与隐私' = '数据|隐私|偷拍视频|个人信息|开盒|录音'
    '劳动权益' = '劳动|员工|骑手|996|裁员|助研津贴|无偿|劳务'
    '未成年人' = '未成年|儿童|幼儿|小学生|少年|9岁|14岁'
    '媒体失真' = '媒体|标题|报道|造神|失真|误传|谣言|阴谋论'
    '摆拍造谣' = '摆拍|造谣|虚构|人设|卖惨|编造|假孕|下药'
    '学术权力' = '导师|研究生|博士生|学术|论文|署名|课题|毕业|实验室'
    '公共治理' = '治理|监管|政策|问责|执法|政府|通报|调查组|公权力'
    '直播带货' = '直播|带货|主播|营销|商品|旗舰店'
    '安全事故' = '事故|安全|死亡|坠亡|坍塌|流产|患癌|灾害|暴雨'
    '垄断' = '垄断|二选一|市场支配'
    'AI生成' = 'AI|人工智能'
    '网络暴力' = '网暴|私刑|辱骂|社会性死亡|隐私曝光|造黄谣'
    '金融风险' = '金融|贷款|裸贷|押金|资金链|银行|募捐'
  }

  $tags = [System.Collections.Generic.List[string]]::new()
  foreach ($tag in $rules.Keys) {
    if ($Text -match $rules[$tag]) { $tags.Add($tag) }
  }
  if ($tags.Count -eq 0) { $tags.Add('公共记忆') }
  return @($tags | Select-Object -First 5)
}

$categoryMeta = @(
  @{ Name = '恶企'; Code = 'EQ'; Table = 2 },
  @{ Name = '庸策'; Code = 'YC'; Table = 3 },
  @{ Name = '奸人'; Code = 'JR'; Table = 4 },
  @{ Name = '丑角'; Code = 'CJ'; Table = 5 },
  @{ Name = '桀师'; Code = 'JS'; Table = 6 }
)

# These links are present in the document's own “资料来源与修订原则” appendix.
# They are reused only when the event title clearly matches the appendix entry.
$appendixSources = @(
  @{ Pattern = '魏则西|血友病吧'; Title = '国家网信办约谈百度公司负责人'; Url = 'https://www.xinhuanet.com/politics/2016-01/16/c_1117795992.htm'; Institution = '新华网' },
  @{ Pattern = '李文亮'; Title = '关于群众反映的涉及李文亮医生有关情况调查'; Url = 'https://www.nhc.gov.cn/xcs/fkdt/202003/4d12a76de7be48b2a3e0f503dadee1b7.shtml'; Institution = '国家卫生健康委' },
  @{ Pattern = '郑州“7·20”'; Title = '河南郑州“7·20”特大暴雨灾害调查报告'; Url = 'https://www.mem.gov.cn/xw/bndt/202201/t20220121_407106.shtml'; Institution = '应急管理部' },
  @{ Pattern = '丰县.*八孩'; Title = '丰县“八孩女子”事件调查处理情况通报'; Url = 'https://www.news.cn/2022-02/23/c_1128408829.htm'; Institution = '新华网' },
  @{ Pattern = '村镇银行.*红码'; Title = '村镇银行储户被赋红码问题调查问责'; Url = 'https://www.smxlz.gov.cn/sitesources/pyjjw/page_pc/xsqjw/qfx/ywyl/article63da58ebcd1b4cd49befccf1bf4583a3.html'; Institution = '纪检监察机关' },
  @{ Pattern = '取快递.*造'; Title = '女子取快递被造谣案一审宣判'; Url = 'https://www.xinhuanet.com/2021-04/30/c_1127399099.htm'; Institution = '新华网' },
  @{ Pattern = '猫一杯|巴黎秦朗'; Title = '“拾到小学生秦朗丢失的作业本”视频系编造'; Url = 'https://www.news.cn/legal/20240412/1af935361d2547dcad8657577793a718/c.html'; Institution = '新华网' },
  @{ Pattern = '凉山孟阳|凉山阿泽|怀孕5个月征婚|给同事下药'; Title = '短视频摆拍引流乱象调查'; Url = 'https://www.news.cn/legal/20240517/c64260ffc3fe44509000bc38d71c2466/c.html'; Institution = '新华网' },
  @{ Pattern = '胖猫'; Title = '“胖猫”事件调查细节'; Url = 'https://www.shyp.gov.cn/shypq/djyy2024/20240526/455709.html'; Institution = '重庆警方公开信息' },
  @{ Pattern = '罐车混运'; Title = '罐车运输食用植物油乱象调查处置'; Url = 'https://www.news.cn/20240825/35ea721fb54e44e18956ff03978ec121/c.html'; Institution = '新华网' },
  @{ Pattern = '武汉大学'; Title = '武汉大学通报图书馆事件调查复核情况'; Url = 'https://www.news.cn/politics/20250920/9ebf1e3922b4482581099d8d97bc4145/c.html'; Institution = '新华网' },
  @{ Pattern = '天水.*血铅'; Title = '幼儿血铅异常问题调查处置情况'; Url = 'https://www.gansu.gov.cn/gsszf/gsyw/202507/174177765.shtml'; Institution = '甘肃省人民政府' },
  @{ Pattern = '14岁.*涡喷|手搓航空发动机'; Title = '14岁制作涡喷模型报道'; Url = 'https://people.cctv.com/2026/04/18/ARTI6yi0dQIUsUH1p2NhAijx260418.shtml'; Institution = '央视网' },
  @{ Pattern = '鹅腿阿姨'; Title = '核查“鹅腿阿姨”涉嫌误导消费者'; Url = 'https://www.news.cn/fortune/20260611/108cf429d4a442e2b568bd0783ce4431/c.html'; Institution = '新华网' },
  @{ Pattern = '2026高考'; Title = '全国公安机关严查严打涉高考网络谣言'; Url = 'https://www.news.cn/20260608/324ff0797c374a5a9d2e3ab37efbfda8/c.html'; Institution = '新华网' },
  @{ Pattern = '香精大米'; Title = '2023年3·15：调出来的假香米'; Url = 'https://tv.cctv.com/2023/03/15/VIDEeU31v8VyvZCVBGFZA7qn230315.shtml'; Institution = '央视网' },
  @{ Pattern = '直播水军'; Title = '2023年3·15：谁在操控水军'; Url = 'https://tv.cctv.com/2023/03/15/VIDEQhZGRPxRAM8DkZqXRDkJ230315.shtml'; Institution = '央视网' },
  @{ Pattern = '保水虾仁|维修刺客|一次性内裤|翻新卫生巾'; Title = '2025年3·15曝光问题处置进展'; Url = 'https://finance.cnr.cn/jdt/20250316/t20250316_527102879.shtml'; Institution = '央广网' },
  @{ Pattern = 'AI/摆拍|农业伪科普|萧鑫传媒|道隐咨询|冒用“大学生”|负债翻身|卖惨人设'; Title = '整治短视频领域恶意营销乱象典型案例'; Url = 'https://www.cac.gov.cn/2025-05/30/c_1750315260446541.htm'; Institution = '中国网信网' }
)

$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $DocumentPath).Path)
try {
  function Read-ZipEntry([string]$Name) {
    $entry = $zip.GetEntry($Name)
    $reader = [System.IO.StreamReader]::new($entry.Open(), [System.Text.Encoding]::UTF8)
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
  }

  [xml]$documentXml = Read-ZipEntry 'word/document.xml'
  [xml]$relsXml = Read-ZipEntry 'word/_rels/document.xml.rels'

  $namespace = [System.Xml.XmlNamespaceManager]::new($documentXml.NameTable)
  $namespace.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
  $namespace.AddNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')

  $relationshipTargets = @{}
  foreach ($relationship in $relsXml.Relationships.Relationship) {
    $relationshipTargets[$relationship.Id] = $relationship.Target
  }

  $tables = $documentXml.SelectNodes('//w:tbl', $namespace)
  $events = [System.Collections.Generic.List[object]]::new()
  $globalSequence = 0

  foreach ($category in $categoryMeta) {
    $table = $tables[$category.Table - 1]
    $rows = $table.SelectNodes('./w:tr', $namespace)
    $categorySequence = 0

    for ($rowIndex = 1; $rowIndex -lt $rows.Count; $rowIndex++) {
      $cells = $rows[$rowIndex].SelectNodes('./w:tc', $namespace)
      if ($cells.Count -lt 7) { continue }

      $year = [int](Get-TextFromNode $cells[0] $namespace)
      $title = Get-TextFromNode $cells[1] $namespace
      $severity = Get-TextFromNode $cells[2] $namespace
      $evidenceBasis = Get-TextFromNode $cells[3] $namespace
      $summary = Get-TextFromNode $cells[4] $namespace
      $historicalMeaning = Get-TextFromNode $cells[5] $namespace
      $sourceText = Get-TextFromNode $cells[6] $namespace

      $sourceUrl = $null
      $hyperlink = $cells[6].SelectSingleNode('.//w:hyperlink[@r:id]', $namespace)
      if ($hyperlink) {
        $relationshipId = $hyperlink.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
        $sourceUrl = $relationshipTargets[$relationshipId]
      }

      $appendixSource = $null
      if (-not $sourceUrl) {
        $appendixSource = $appendixSources | Where-Object { $title -match $_.Pattern } | Select-Object -First 1
        if ($appendixSource) { $sourceUrl = $appendixSource.Url }
      }

      $globalSequence++
      $categorySequence++
      $evidenceLevel = Get-EvidenceLevel $evidenceBasis
      $allText = "$title $evidenceBasis $summary $historicalMeaning"
      $sourceTitle = if ($appendixSource) { $appendixSource.Title } elseif ($sourceUrl) { "原始文档核验链接：$title" } else { "原始文档待补证：$evidenceBasis" }
      $eventId = ('cyber-{0}-{1}-{2:D3}' -f $year, $category.Code.ToLowerInvariant(), $categorySequence)
      $sourceInstitution = if ($appendixSource) { $appendixSource.Institution } else { Get-SourceInstitution $sourceUrl }
      $sourceMetadata = Get-SourceMetadata $sourceUrl $sourceInstitution
      $source = [ordered]@{
        id = "$eventId-source-1"
        title = $sourceTitle
        institution = $sourceInstitution
        date = "$year"
        url = $sourceUrl
        note = if ($sourceText -eq '查' -and -not $sourceUrl) { 'Word 原稿标记为“查”，尚未附直接链接。' } else { $null }
        sourceRank = $sourceMetadata.Rank
        sourceType = $sourceMetadata.Type
        sourceRole = $sourceMetadata.Role
        archiveStatus = $sourceMetadata.Archive
      }

      $event = [ordered]@{
        id = $eventId
        archiveCode = ('CYBER-{0}-{1:D3}' -f $year, $globalSequence)
        title = $title
        year = $year
        date = "$year"
        category = $category.Name
        severity = $severity
        evidenceLevel = $evidenceLevel
        evidenceBasis = $evidenceBasis
        status = if ($evidenceLevel -eq '司法定案') { '已定案' } elseif ($evidenceLevel -eq '强争议' -or $evidenceLevel -eq '未核实') { '尚无最终定论' } else { '已有公开处置' }
        subjectType = Get-SubjectType $allText
        subjects = @()
        tags = @(Get-Tags $allText)
        summary = $summary
        historicalMeaning = $historicalMeaning
        sources = @($source)
        featured = ($severity -eq 'S')
      }
      $events.Add([pscustomobject]$event)
    }
  }

  $expected = 142
  if ($events.Count -ne $expected) {
    throw "Expected $expected events but extracted $($events.Count)."
  }

  $outputDirectory = Split-Path $OutputPath -Parent
  if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory | Out-Null
  }
  $json = $events | ConvertTo-Json -Depth 8
  [System.IO.File]::WriteAllText($OutputPath, $json, [System.Text.UTF8Encoding]::new($false))
  Write-Output "Extracted $($events.Count) events to $OutputPath"
}
finally {
  $zip.Dispose()
}
