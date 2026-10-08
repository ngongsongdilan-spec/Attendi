from django.urls import path

from . import views_auth

urlpatterns = [
    path("register/", views_auth.RegisterView.as_view(), name="auth-register"),
    path("self-register/", views_auth.SelfRegisterView.as_view(), name="auth-self-register"),
    path("login/", views_auth.LoginView.as_view(), name="auth-login"),
    path("logout/", views_auth.LogoutView.as_view(), name="auth-logout"),
    path("refresh/", views_auth.TokenRefreshView.as_view(), name="auth-refresh"),
    path("me/", views_auth.MeView.as_view(), name="auth-me"),
    path("change-password/", views_auth.ChangePasswordView.as_view(), name="auth-change-password"),
    path("forgot-password/", views_auth.ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("reset-password/", views_auth.ResetPasswordView.as_view(), name="auth-reset-password"),
]
