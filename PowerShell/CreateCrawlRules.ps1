[CmdletBinding()]
Param(
  [Parameter(Mandatory=$True,Position=1)]
   [string]$fileName
)

#http://sharepointbrainpump.blogspot.com/2012/10/powershell-howo-creating-and-deleting-crawl-rules.html
Add-PSSnapin "Microsoft.SharePoint.PowerShell" -ErrorAction SilentlyContinue

write-host "Parsing file: " $fileName
$XmlDoc = [xml](Get-Content $fileName)

$sa = $XmlDoc.SearchProperties.ServiceName
$searchapp = Get-SPEnterpriseSearchServiceApplication $sa

$RuleNodeList = $XmlDoc.CrawlRules.Rules
foreach ($XmlRule in $RuleNodeList.Rule)
{
	$path = $XmlRule.InnerText
	if ((Get-SPEnterpriseSearchCrawlRule -SearchApplication $searchapp -Identity $path -EA SilentlyContinue)) 
	{
      Write-Host "Rule Removed: " $path
	  Remove-SPEnterpriseSearchCrawlRule -SearchApplication $searchapp -Identity $path -confirm:$false
	}
	$complexUrls = [System.Convert]::ToBoolean($XmlRule.FollowComplexUrls)
	$regExp = [System.Convert]::ToBoolean($XmlRule.RegularExpression)
	New-SPEnterpriseSearchCrawlRule -SearchApplication $searchapp -Path $path -Type $XmlRule.Type -IsAdvancedRegularExpression $regExp -FollowComplexUrls $complexUrls
	
    $Rule = Get-SPEnterpriseSearchCrawlRule -SearchApplication $searchapp -Identity $path -EA SilentlyContinue
    if($XmlRule.Type -eq "InclusionRule") {
        $Rule.CrawlAsHttp = [System.Convert]::ToBoolean($XmlRule.CrawlAsHttp)
        $Rule.SuppressIndexing = [System.Convert]::ToBoolean($XmlRule.SuppressIndexing)
        $Rule.Update()
    }    
}