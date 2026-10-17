from django.urls import path

from . import views_auth

urlpatterns = [
    path("register/", views_auth.RegisterView.as_view(), name="auth-register"),
    path("self-register/", views_auth.SelfRegisterView.as_view(), name="auth-self-register"),
    path("login/", views_auth.LoginView.as_view(), name="auth-login"),
    path("logout/", views_auth.LogoutView.as_view(), name="auth-logout"),
    path("refresh/", views_auth.TokenRefreshView.as_view(), name="auth-refresh"),
    path("me/", views_auth.MeView.as_view(), name="auth-me"),
    path("account/", views_auth.DeleteAccountView.as_view(), name="auth-delete-account"),
    path("change-password/", views_auth.ChangePasswordView.as_view(), name="auth-change-password"),
    path("forgot-password/request-otp/", views_auth.RequestOtpView.as_view(), name="auth-request-otp"),
    path("reset-password/verify-otp/", views_auth.VerifyOtpView.as_view(), name="auth-verify-otp"),
    path("reset-password/confirm/", views_auth.ConfirmResetView.as_view(), name="auth-confirm-reset"),
]
