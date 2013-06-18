using System;
using System.Collections.Generic;
using AlmondLabs.Sharepoint.Core.Log;
using Microsoft.ApplicationServer.Caching;
using Microsoft.SharePoint.Administration;
using Microsoft.SharePoint.DistributedCaching.Utilities;
using Microsoft.SharePoint.Utilities;

namespace AlmondLabs.Sharepoint.Core.Cache
{
    public static class CacheManager
    {
        //http://bernado-nguyen-hoan.com/2013/01/03/how-to-use-sharepoints-2013-appfabric-caching-in-your-code/

        private static readonly object Lock = new object();
        private static DataCache _defaultCache;

        public static DataCache DefaultCache
        {
            get
            {
                using (new SPMonitoredScope("AL.SP.CacheManager.DefaultCache"))
                {
                    lock (Lock)
                    {
                        if (_defaultCache == null)
                        {
                            //Must revert to application pool account in multi front end farms
                            using (new Utils.SecurityContext())
                            {
                                var dataCacheFactoryConfiguration = GetDataCacheFactoryConfiguration();
                                var dataCacheFactory = new DataCacheFactory(dataCacheFactoryConfiguration);
                                _defaultCache = dataCacheFactory.GetCache(
                                    string.Format("{0}_{1}", SPDistributedCacheContainerType.DistributedDefaultCache,
                                                  SPFarm.Local.Id));
                            }
                        }
                        return _defaultCache;
                    }
                }
            }
        }

        private static DataCacheFactoryConfiguration GetDataCacheFactoryConfiguration()
        {
            //
            SPDistributedCacheClusterInfoManager local = SPDistributedCacheClusterInfoManager.Local;
            SPDistributedCacheClusterInfo sPDistributedCacheClusterInfo =
                local.GetSPDistributedCacheClusterInfo(SPDistributedCacheClusterConfigHelper.SPDistributedCacheClusterName);
            var settings = local.GetSPDistributedCacheClientConfigurationSettings(SPDistributedCacheContainerType.DistributedDefaultCache);
            SPDistributedCacheHostInfoCollection cacheHostsInfoCollection = sPDistributedCacheClusterInfo.CacheHostsInfoCollection;
            var list = new List<DataCacheServerEndpoint>();
            foreach (SPDistributedCacheHostInfo current in cacheHostsInfoCollection)
            {
                DiagnosticLog.LogInfo("GetAllDataCacheServerEndpointsForFarm", current.HostName);
                if (current.CacheHostStatus == SPDistributedCacheHostStatus.UP)
                {
                    list.Add(new DataCacheServerEndpoint(current.HostName, current.CachePort));
                }
            }
            if (list.Count == 0)
            {
                throw new InvalidOperationException("InitializeDataCacheFactory - No cache hosts are present or running in the farm.");
            }
            var dataCacheFactoryConfiguration = new DataCacheFactoryConfiguration
            {
                DataCacheServiceAccountType = SPServer.LocalServerRole == SPServerRole.SingleServer
                                                  ? DataCacheServiceAccountType.SystemAccount
                                                  : DataCacheServiceAccountType.DomainAccount,
                Servers = list,
                ChannelOpenTimeout = settings.ChannelOpenTimeOut,
                RequestTimeout = settings.RequestTimeout,
                MaxConnectionsToServer = settings.MaxConnectionsToServer,
                TransportProperties =
                {
                    ChannelInitializationTimeout = settings.ChannelInitializationTimeout,
                    ConnectionBufferSize = settings.ConnectionBufferSize,
                    MaxBufferPoolSize = settings.MaxBufferPoolSize,
                    MaxBufferSize = settings.MaxBufferSize,
                    MaxOutputDelay = settings.MaxOutputDelay,
                    ReceiveTimeout = settings.ReceiveTimeout
                },
                SecurityProperties = new DataCacheSecurity(DataCacheSecurityMode.Transport,
                                                           DataCacheProtectionLevel.EncryptAndSign),
                LocalCacheProperties = new DataCacheLocalCacheProperties(),
                NotificationProperties = new DataCacheNotificationProperties(10000L, TimeSpan.FromSeconds(5.0))
            };
            return dataCacheFactoryConfiguration;
        }

        public static T Get<T>(string key)
        {
            try
            {
                var cacheItem = DefaultCache.GetCacheItem(key);
                DiagnosticLog.LogInfo("CacheManager.Get", typeof(T).ToString());
                if (cacheItem != null)
                    return (T)cacheItem.Value;
            }
            catch (DataCacheException dce)
            {
                DiagnosticLog.LogError("CacheManager.Get", dce.ToString());
            }
            return default(T);
        }

        public static void Put<T>(string key, T value, TimeSpan timeSpan)
        {
            try
            {
                if (!Equals(Get<T>(key), default(T)))
                    DefaultCache.Remove(key);

                DefaultCache.Add(key, value, timeSpan);
                DiagnosticLog.LogInfo("CacheManager.Put", typeof(T).ToString());
            }
            catch (DataCacheException dce)
            {
                DiagnosticLog.LogError("CacheManager.Put", dce.ToString());
            }
        }
    }
}
