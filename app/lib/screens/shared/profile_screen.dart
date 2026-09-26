import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/role_switch_sheet.dart';
import '../auth/login_screen.dart';
import '../customer/edit_customer_profile_screen.dart';
import '../provider/edit_provider_profile_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.currentUser;
    final isProvider = auth.isProvider;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Account & Settings'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          children: [
            // User Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: const BoxDecoration(
                      color: AppColors.primaryUltraLight,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isProvider ? Icons.handyman : Icons.person,
                      color: AppColors.primary,
                      size: 32,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.fullName ?? (isProvider ? 'Nimal Jayawardena' : 'Kasun Perera'),
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          user?.email ?? (isProvider ? 'provider@handee.lk' : 'customer@handee.lk'),
                          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: isProvider ? AppColors.warningLight : AppColors.primaryUltraLight,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            isProvider ? 'Tradesperson (NVQ-4 Vetted)' : 'Verified Customer',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: isProvider ? AppColors.warning : AppColors.primary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Profile Fulfillment / Edit Card
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: AppColors.primaryUltraLight,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isProvider ? Icons.construction : Icons.edit_note,
                    color: AppColors.primary,
                    size: 20,
                  ),
                ),
                title: Text(
                  isProvider ? 'Manage Trade Profile & Skills' : 'Edit Customer Profile',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                subtitle: Text(
                  isProvider
                      ? 'Update trade skills, rates, experience & service areas'
                      : 'Update name, phone number & primary address',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => isProvider
                          ? const EditProviderProfileScreen()
                          : const EditCustomerProfileScreen(),
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 16),

            // Presentation Mode: Role Switcher
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: AppColors.primaryUltraLight,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.swap_horiz, color: AppColors.primary, size: 20),
                ),
                title: const Text('Switch Role (Demo Mode)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: Text('Currently active: ${user?.role ?? "Customer"}', style: const TextStyle(fontSize: 12)),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                onTap: () => RoleSwitchSheet.show(context),
              ),
            ),

            const SizedBox(height: 12),

            // Backend & API Configuration
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Backend API Configuration',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Connected to ASP.NET Core Web API (/job-requests, /bookings, /auth).',
                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Backend Connection',
                              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                            Text(
                              'Connected directly to ASP.NET Core API',
                              style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.successLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.check_circle, size: 14, color: AppColors.success),
                            SizedBox(width: 4),
                            Text(
                              'Live',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.success,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // App info & logout
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Column(
                children: [
                  const ListTile(
                    leading: Icon(Icons.verified_user_outlined, color: AppColors.textSecondary, size: 22),
                    title: Text('Trust & Verification Guidelines', style: TextStyle(fontSize: 14)),
                    trailing: Icon(Icons.arrow_forward_ios, size: 14),
                  ),
                  const Divider(height: 1, color: AppColors.borderLight),
                  const ListTile(
                    leading: Icon(Icons.help_outline, color: AppColors.textSecondary, size: 22),
                    title: Text('Help & Support (Sri Lanka)', style: TextStyle(fontSize: 14)),
                    trailing: Icon(Icons.arrow_forward_ios, size: 14),
                  ),
                  const Divider(height: 1, color: AppColors.borderLight),
                  ListTile(
                    leading: const Icon(Icons.logout, color: AppColors.error, size: 22),
                    title: const Text('Sign Out', style: TextStyle(fontSize: 14, color: AppColors.error, fontWeight: FontWeight.w600)),
                    onTap: () async {
                      await auth.logout();
                      if (context.mounted) {
                        Navigator.pushAndRemoveUntil(
                          context,
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                          (route) => false,
                        );
                      }
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 30),

            const Text(
              'Handee Mobile v1.0.0 (SE3090 Assignment 1)\nFaculty of Computing, SLIIT',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.4),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
