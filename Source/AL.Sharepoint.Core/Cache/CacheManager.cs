using System;
using System.Collections.Generic;
using AL.Sharepoint.Core.Log;
using AL.Sharepoint.Core.Utils;
using Microsoft.ApplicationServer.Caching;
using Microsoft.SharePoint.Administration;
using Microsoft.SharePoint.DistributedCaching.Utilities;

namespace AL.Sharepoint.Core.Cache
{
    //http://bernado-nguyen-hoan.com/2013/01/03/how-to-use-sharepoints-2013-appfabric-caching-in-your-code/
    //Source: Microsoft.SharePoint.DistributedCaching.SPDistributedCachePointerWrapper
    //Notes:
    //   Take care when using the delegate methods for long operations. 
    //   You may see time outs in your ULS logs.

    public static class CacheManager
    {
        private static readonly object Lock = new object();
        private static DataCache _defaultCache;

        public static DataCache DefaultCache
        {
            get
            {
                lock (Lock)
                {
                    if (_defaultCache == null)
                    {
                        using (new SecurityContext())
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

        private static DataCacheFactoryConfiguration GetDataCacheFactoryConfiguration()
        {
            SPDistributedCacheClusterInfoManager local = SPDistributedCacheClusterInfoManager.Local;
            SPDistributedCacheClusterInfo sPDistributedCacheClusterInfo =
                local.GetSPDistributedCacheClusterInfo(SPDistributedCacheClusterConfigHelper.SPDistributedCacheClusterName);
            var settings = local.GetSPDistributedCacheClientConfigurationSettings(
                    SPDistributedCacheContainerType.DistributedDefaultCache);
            SPDistributedCacheHostInfoCollection cacheHostsInfoCollection =
                sPDistributedCacheClusterInfo.CacheHostsInfoCollection;
            var list = new List<DataCacheServerEndpoint>();
            foreach (SPDistributedCacheHostInfo current in cacheHostsInfoCollection)
            {
                DiagnosticLog.Info("GetAllDataCacheServerEndpointsForFarm", current.HostName);
                if (current.CacheHostStatus == SPDistributedCacheHostStatus.UP)
                {
                    list.Add(new DataCacheServerEndpoint(current.HostName, current.CachePort));
                }
            }
            if (list.Count == 0)
            {
                throw new InvalidOperationException(
                    "InitializeDataCacheFactory - No cache hosts are present or running in the farm.");
            }
            var dataCacheFactoryConfiguration = new DataCacheFactoryConfiguration
            {
                DataCacheServiceAccountType = SPServer.LocalServerRole == SPServerRole.SingleServer
                    ? DataCacheServiceAccountType.SystemAccount : DataCacheServiceAccountType.DomainAccount,
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
                if (cacheItem != null)
                    return (T)cacheItem.Value;
            }
            catch (Exception dce)
            {
                DiagnosticLog.Error("CacheManager.Get", key + ":" + dce);
            }
            return default(T);
        }

        public static void Put<T>(string key, T value, TimeSpan timeSpan)
        {
            try
            {
                if (Equals(value, default(T)))
                    return;

                DiagnosticLog.Info("CacheManager.Put", typeof(T).ToString());

                if (Equals(Get<T>(key), default(T)))
                    DefaultCache.Add(key, value, timeSpan);
                else
                {
                    DefaultCache.Remove(key);
                    DefaultCache.Put(key, value, timeSpan);
                }
            }
            catch (Exception dce)
            {
                DiagnosticLog.Error("CacheManager.Put", dce.ToString());
            }
        }

        public static void Remove(string key)
        {
            try
            {
                DiagnosticLog.Info("CacheManager.Remove", key);
                DefaultCache.Remove(key);
            }
            catch (Exception dce)
            {
                DiagnosticLog.Error("CacheManager.Remove", dce.ToString());
            }
        }

        public static T Get<T>(string key, TimeSpan timeSpan, Func<T> getAction)
        {
            var obj = Get<T>(key);
            if (Equals(obj, default(T)))
            {
                obj = getAction();
                Put(key, obj, timeSpan);
            }
            return obj;
        }

        public static T Get<T>(string key, TimeSpan timeSpan, Action<T> getAction) where T : new()
        {
            var obj = Get<T>(key);
            if (Equals(obj, default(T)))
            {
                obj = new T();
                getAction(obj);
                Put(key, obj, timeSpan);
            }
            return obj;
        }
    }
}
