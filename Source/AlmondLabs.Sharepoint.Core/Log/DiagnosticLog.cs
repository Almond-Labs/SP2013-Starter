using System.Collections.Generic;
using Microsoft.SharePoint.Administration;

namespace AlmondLabs.Sharepoint.Core.Log
{
    //http://blog.mastykarz.nl/logging-uls-sharepoint-2010/

    [System.Runtime.InteropServices.Guid("02420c76-a3b9-4526-9685-2a9e659a838a")]
    public class DiagnosticLog : SPDiagnosticsServiceBase
    {
        private const string ProductName = "AlmondLabs.SharePoint";
        private const string InfoCategory = ProductName + "_Info";
        private const string ErrorCategory = ProductName + "_Error";

        private DiagnosticLog() : base(ProductName + ".Logging", SPFarm.Local) { }

        private static DiagnosticLog _logService;
        public static DiagnosticLog LogService
        {
            get { return _logService ?? (_logService = new DiagnosticLog()); }
        }

        protected override IEnumerable<SPDiagnosticsArea> ProvideAreas()
        {
            var areas = new List<SPDiagnosticsArea> {
              new SPDiagnosticsArea(ProductName, new List<SPDiagnosticsCategory> {
                  new SPDiagnosticsCategory(InfoCategory, TraceSeverity.Verbose, EventSeverity.Information),
                  new SPDiagnosticsCategory(ErrorCategory, TraceSeverity.Unexpected, EventSeverity.Warning),
              })
            };
            return areas;
        }

        public static void LogInfo(string methodName, string errorMessage)
        {
            SPDiagnosticsCategory category = LogService.Areas[ProductName].Categories[InfoCategory];
            LogService.WriteTrace(0, category, TraceSeverity.Verbose, methodName + "::" + errorMessage);
        }

        public static void LogError(string methodName, string errorMessage)
        {
            SPDiagnosticsCategory category = LogService.Areas[ProductName].Categories[ErrorCategory];
            LogService.WriteTrace(0, category, TraceSeverity.Unexpected, methodName + "::" + errorMessage);
        }
    }
}
