[CmdletBinding()]
Param(
  [Parameter(Mandatory=$True,Position=1)]
   [string]$fileName,
   [Parameter(Mandatory=$True,Position=2)]
   [string]$siteUrl
)

#http://blog.tippoint.net/create-result-source-with-powershell-sharepoint-2013/
Add-PSSnapin "Microsoft.SharePoint.PowerShell" -ErrorAction SilentlyContinue

# load Search assembly
[void] [Reflection.Assembly]::LoadWithPartialName("Microsoft.Office.Server.Search")

write-host "Parsing file: " $fileName
$XmlDoc = [xml](Get-Content $fileName)

#Search Service Application
$sa = $XmlDoc.SearchProperties.ServiceName
$searchapp = Get-SPEnterpriseSearchServiceApplication $sa

#Any site connected to the search application
$site = get-spsite $siteUrl

# create manager instances
$fedManager = New-Object Microsoft.Office.Server.Search.Administration.Query.FederationManager($searchapp)
$searchOwner = New-Object Microsoft.Office.Server.Search.Administration.SearchObjectOwner([Microsoft.Office.Server.Search.Administration.SearchObjectLevel]::Ssa, $site.RootWeb)

#process sources
$SourcesList = $XmlDoc.SearchSources.Sources
foreach ($SourceNode in $SourcesList.Source)
{
    $resultSource = $fedManager.GetSourceByName($SourceNode.Name, $searchOwner)
    if($resultSource -ne $null) { 
		#Remove existing source
        Write-Host "Source Removed: " $resultSource.Name
        $fedManager.RemoveSource($resultSource)
    }
	
	$query = $SourceNode.InnerText
	$queryProperties = New-Object Microsoft.Office.Server.Search.Query.Rules.QueryTransformProperties
	
	#prepare sorting
	if($SourceNode.SortField -ne "")
	{
		$sortCollection = New-Object Microsoft.Office.Server.Search.Query.SortCollection
		$sortDirection = [Microsoft.Office.Server.Search.Query.SortDirection]::Ascending
		if($SourceNode.SortDirection -eq "Descending")
		{
			$sortDirection = [Microsoft.Office.Server.Search.Query.SortDirection]::Descending
		}
		$sortCollection.Add($SourceNode.SortField, $sortDirection)
		$queryProperties["SortList"] = [Microsoft.Office.Server.Search.Query.SortCollection]$sortCollection
	}
	
	#Create source
	$resultSource = $fedManager.CreateSource($searchOwner)
	$resultSource.Name = $SourceNode.Name
	$resultSource.ProviderId = $fedManager.ListProviders()[$SourceNode.Provider].Id
	$resultSource.CreateQueryTransform($queryProperties, $query)
	$resultSource.Commit()
}