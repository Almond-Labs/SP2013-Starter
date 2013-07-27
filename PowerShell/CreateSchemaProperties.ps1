[CmdletBinding()]
Param(
  [Parameter(Mandatory=$True,Position=1)]
   [string]$fileName
)

#http://consultingblogs.emc.com/mattlally/archive/2011/12/20/create-sharepoint-2010-search-crawl-and-managed-properties-using-powershell.aspx
Add-PSSnapin "Microsoft.SharePoint.PowerShell" -ErrorAction SilentlyContinue

write-host "Parsing file: " $fileName
$XmlDoc = [xml](Get-Content $fileName)

#Search Service Application
$sa = $XmlDoc.SearchProperties.ServiceName
$searchapp = Get-SPEnterpriseSearchServiceApplication $sa

#process crawled properties
$CrawledPropNodeList = $XmlDoc.SearchProperties.CrawledProperties
foreach ($CrawledPropNode in $CrawledPropNodeList.CrawledProperty)
{
    #create crawled property if it doesn't exist
    if (!(Get-SPEnterpriseSearchMetadataCrawledProperty -SearchApplication $searchapp -Name $CrawledPropNode.Name -ea "silentlycontinue"))
    {
		$varType = 0
        switch ($CrawledPropNode.Type)
        {
            "Text" { $varType=31 }
            "Integer" { $varType=20 }  
            "Decimal" { $varType=5 }  
            "DateTime" { $varType=64 }
            "YesNo" { $varType=11 }
            default { $varType=31 }
        }
		$crawlprop = New-SPEnterpriseSearchMetadataCrawledProperty -SearchApplication $searchapp -Category SharePoint -VariantType $varType -Name $CrawledPropNode.Name -IsNameEnum $false -PropSet "00130329-0000-0130-c000-000000131346"
    }
}

#process managed properties
$PropertyNodeList = $XmlDoc.SearchProperties.ManagedProperties
foreach ($PropertyNode in $PropertyNodeList.ManagedProperty)
{
    $SharePointPropMapList = $PropertyNode.Map
	$recreate = [System.Convert]::ToBoolean($PropertyNode.Recreate)
    if ($recreate)
    {
		#Delete if property should be recreated and it exists
		if($mp = Get-SPEnterpriseSearchMetadataManagedProperty -SearchApplication $searchapp -Identity $PropertyNode.Name -ea "silentlycontinue")
		{
            Write-Host "Managed Property Removed: " $PropertyNode.Name
			$mp.DeleteAllMappings()
			$mp.Delete()
			$searchapp.Update()
		}
		
		#create managed property
		New-SPEnterpriseSearchMetadataManagedProperty -SearchApplication $searchapp -Name $PropertyNode.Name -Type $PropertyNode.Type
    }

	if($mp = Get-SPEnterpriseSearchMetadataManagedProperty -SearchApplication $searchapp -Identity $PropertyNode.Name)
	{
		if($recreate)
		{
			#set configuration for new property
			$mp.RespectPriority = [System.Convert]::ToBoolean($PropertyNode.RespectPriority)
			$mp.Searchable = [System.Convert]::ToBoolean($PropertyNode.Searchable)
			$mp.Queryable = [System.Convert]::ToBoolean($PropertyNode.Queryable)
			$mp.Retrievable = [System.Convert]::ToBoolean($PropertyNode.Retrievable)
			$mp.HasMultipleValues = [System.Convert]::ToBoolean($PropertyNode.HasMultiple)
			$mp.Refinable = [System.Convert]::ToBoolean($PropertyNode.Refinable)
			$mp.Sortable = [System.Convert]::ToBoolean($PropertyNode.Sortable)
			$mp.Update()
		}

		#add property mappings
		foreach ($SharePointPropMap in $SharePointPropMapList)
		{
			$cat = Get-SPEnterpriseSearchMetadataCategory –SearchApplication $searchapp –Identity $SharePointPropMap.Category
			$prop = Get-SPEnterpriseSearchMetadataCrawledProperty -SearchApplication $searchapp -Category $cat -Name $SharePointPropMap.InnerText
			New-SPEnterpriseSearchMetadataMapping -SearchApplication $searchapp -CrawledProperty $prop -ManagedProperty $mp
		}
	}
}