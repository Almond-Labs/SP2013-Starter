using System;
using AlmondLabs.Sharepoint.Core.Log;
using Microsoft.SharePoint;

namespace AlmondLabs.Sharepoint.Core.Utils
{
    public class SPUtils
    {
        public static void ListOpElevated(string webUrl, string listName, Action<SPList> listOp)
        {
            SPSecurity.RunWithElevatedPrivileges(() => ListOp(webUrl, listName, listOp));
        }

        public static void ListOp(string webUrl, string listName, Action<SPList> listOp)
        {
            WebOp(webUrl, web =>
                {
                    try
                    {
                        SPList list = web.Lists[listName];
                        listOp(list);
                    }
                    catch (Exception ex)
                    {
                        DiagnosticLog.Error(listOp.Method.Name, ex.ToString());
                        throw;
                    }
                });
        }

        public static void WebOpElevated(string webUrl, Action<SPWeb> op)
        {
            SPSecurity.RunWithElevatedPrivileges(() => WebOp(webUrl, op));
        }

        public static void WebOp(string webUrl, Action<SPWeb> op)
        {
            SiteOp(webUrl, site =>
                {
                    using (SPWeb web = site.OpenWeb())
                    {
                        bool auuOrig = false;
                        try
                        {
                            auuOrig = web.AllowUnsafeUpdates;
                            web.AllowUnsafeUpdates = true;
                            op(web);
                        }
                        catch (Exception ex)
                        {
                            DiagnosticLog.Error(op.Method.Name, ex.ToString());
                            throw;
                        }
                        finally
                        {
                            web.AllowUnsafeUpdates = auuOrig;
                        }
                    }
                });
        }

        public static void SiteOpElevated(string siteUrl, Action<SPSite> op)
        {
            SPSecurity.RunWithElevatedPrivileges(() => SiteOp(siteUrl, op));
        }

        public static void SiteOp(string siteUrl, Action<SPSite> op)
        {
            using (var site = new SPSite(siteUrl))
            {
                try
                {
                    op(site);
                }
                catch (Exception ex)
                {
                    DiagnosticLog.Error(op.Method.Name, ex.ToString());
                    throw;
                }
            }
        }

        public static void ElevatedListOp(string webUrl, string listName, Action<SPList> op)
        {
            WebOpElevated(webUrl, web =>
                {
                    SPList list = web.Lists[listName];
                    if (list == null)
                        throw new ApplicationException(string.Format("List '{0}' cannot be found in '{1}' web", listName,
                                                                     webUrl));
                    op(list);
                });
        }
    }
}
