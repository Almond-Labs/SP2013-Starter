using System;
using System.Security.Principal;

namespace AL.Sharepoint.Core.Utils
{
    sealed class SecurityContext : IDisposable
    {
        WindowsImpersonationContext _ctx;
        public SecurityContext()
        {
            UseAppPoolIdentity();
        }

        private void UseAppPoolIdentity()
        {
            try
            {
                if (!WindowsIdentity.GetCurrent().IsSystem)
                {
                    _ctx = WindowsIdentity.Impersonate(IntPtr.Zero);
                }
            }
            catch { }
        }

        private void ReturnToCurrentUser()
        {
            try
            {
                if (_ctx != null)
                {
                    _ctx.Undo();
                }
            }
            catch { }
        }
        public void Dispose()
        {
            ReturnToCurrentUser();
        }
    }
}
