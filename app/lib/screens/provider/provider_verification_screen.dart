import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/constants/colors.dart';
import '../../data/repositories/provider_repository.dart';
import '../../providers/service_directory_provider.dart';
import '../../widgets/custom_button.dart';

class ProviderVerificationScreen extends StatefulWidget {
  const ProviderVerificationScreen({super.key});

  @override
  State<ProviderVerificationScreen> createState() => _ProviderVerificationScreenState();
}

class _ProviderVerificationScreenState extends State<ProviderVerificationScreen> {
  final _picker = ImagePicker();
  bool _isUploading = false;
  String? _nicFilePath;
  String? _certFilePath;
  String? _errorMessage;

  Future<void> _pickNic() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      setState(() => _nicFilePath = image.path);
    }
  }

  Future<void> _pickCert() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      setState(() => _certFilePath = image.path);
    }
  }

  Future<void> _uploadDocuments() async {
    if (_nicFilePath == null && _certFilePath == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one document to upload.')),
      );
      return;
    }

    setState(() {
      _isUploading = true;
      _errorMessage = null;
    });

    final dir = context.read<ServiceDirectoryProvider>();
    final providerRepo = context.read<ProviderRepository>();
    final profile = dir.myProfile;

    if (profile == null) {
      setState(() {
        _isUploading = false;
        _errorMessage = 'Profile not loaded. Please try again.';
      });
      return;
    }

    try {
      if (_nicFilePath != null) {
        await providerRepo.uploadDocument(
          profileId: profile.id,
          filePath: _nicFilePath!,
          documentType: 'NIC',
        );
      }

      if (_certFilePath != null) {
        await providerRepo.uploadDocument(
          profileId: profile.id,
          filePath: _certFilePath!,
          documentType: 'TradeCertification',
        );
      }

      await dir.loadMyProviderProfile();

      if (mounted) {
        setState(() {
          _isUploading = false;
          _nicFilePath = null;
          _certFilePath = null;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Documents submitted successfully for admin review!'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isUploading = false;
          _errorMessage = e.toString().replaceAll('ApiException', '').trim();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dir = context.watch<ServiceDirectoryProvider>();
    final profile = dir.myProfile;
    final status = profile?.verificationStatus ?? 'Pending';
    final isVerified = status.toLowerCase() == 'verified';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Identity & Verification'),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: isVerified ? AppColors.successLight : AppColors.primaryUltraLight,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isVerified ? AppColors.success : AppColors.primaryLight,
                  width: 1.5,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    isVerified ? Icons.verified : Icons.shield_outlined,
                    color: isVerified ? AppColors.success : AppColors.primary,
                    size: 32,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isVerified ? 'Profile Verified' : 'Verification Status: $status',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: isVerified ? AppColors.success : AppColors.primaryDark,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          isVerified
                              ? 'Your credentials are approved. You have full access to high-priority dispatches.'
                              : 'Handee administrators review uploaded documents within 24 hours.',
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(color: AppColors.error, fontSize: 13),
                ),
              ),
            ],

            const SizedBox(height: 24),
            const Text(
              'Upload Verification Documents',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 6),
            const Text(
              'Uploading a clear copy of your Sri Lanka NIC and any trade/NVQ certificates allows admins to verify your account.',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),

            // NIC Upload
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.badge, size: 20, color: AppColors.primary),
                      SizedBox(width: 8),
                      Text('National Identity Card (NIC)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_nicFilePath != null) ...[
                    Row(
                      children: [
                        const Icon(Icons.check, size: 16, color: AppColors.success),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            _nicFilePath!.split(Platform.pathSeparator).last,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: () => setState(() => _nicFilePath = null),
                        ),
                      ],
                    ),
                  ],
                  OutlinedButton.icon(
                    onPressed: _pickNic,
                    icon: const Icon(Icons.upload_file, size: 16),
                    label: Text(_nicFilePath != null ? 'Change NIC File' : 'Select NIC Document'),
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(38)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Trade Certificate Upload
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.workspace_premium, size: 20, color: AppColors.primary),
                      SizedBox(width: 8),
                      Text('NVQ / Trade Certification (Optional)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_certFilePath != null) ...[
                    Row(
                      children: [
                        const Icon(Icons.check, size: 16, color: AppColors.success),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            _certFilePath!.split(Platform.pathSeparator).last,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: () => setState(() => _certFilePath = null),
                        ),
                      ],
                    ),
                  ],
                  OutlinedButton.icon(
                    onPressed: _pickCert,
                    icon: const Icon(Icons.upload_file, size: 16),
                    label: Text(_certFilePath != null ? 'Change Certificate' : 'Select Trade Certificate'),
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(38)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            CustomButton(
              text: 'Submit Documents for Verification',
              isLoading: _isUploading,
              onPressed: _uploadDocuments,
            ),
          ],
        ),
      ),
    );
  }
}
