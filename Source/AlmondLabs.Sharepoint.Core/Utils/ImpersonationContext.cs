﻿using System;
using System.Security.Principal;

namespace AL.Sharepoint.Core.Utils
{
    internal class ImpersonationContext : IDisposable
    {
        WindowsImpersonationContext _ctx;
        public ImpersonationContext()
        {
            UseAppPoolIdentity();
        }

        private void UseAppPoolIdentity()
        {
            try
            {
                var identity = WindowsIdentity.GetCurrent();
                if (identity != null && !identity.IsSystem)
                {
                    _ctx = WindowsIdentity.Impersonate(IntPtr.Zero);
                }
            }
            catch { ReturnToCurrentUser();}
        }

        private void ReturnToCurrentUser()
        {
            try
            {
                if (_ctx != null)
                {
                    _ctx.Undo();
                    _ctx.Dispose();
                }
            }
            catch
            {
                _ctx = null;
            }
        }
        public void Dispose()
        {
            ReturnToCurrentUser();
        }
    }
}
