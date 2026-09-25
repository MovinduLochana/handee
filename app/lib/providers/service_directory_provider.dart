import 'package:flutter/foundation.dart';
import '../data/models/provider_profile_model.dart';
import '../data/models/service_listing_model.dart';
import '../data/repositories/provider_repository.dart';
import '../data/repositories/service_listing_repository.dart';

class ServiceDirectoryProvider extends ChangeNotifier {
  final ProviderRepository providerRepo;
  final ServiceListingRepository serviceListingRepo;

  ServiceDirectoryProvider({
    required this.providerRepo,
    required this.serviceListingRepo,
  });

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  List<ProviderProfileModel> _searchResults = [];
  List<ProviderProfileModel> get searchResults => _searchResults;

  List<ServiceListingModel> _serviceSearchResults = [];
  List<ServiceListingModel> get serviceSearchResults => _serviceSearchResults;

  List<ProviderProfileModel> _topProviders = [];
  List<ProviderProfileModel> get topProviders => _topProviders;

  List<ServiceListingModel> _popularServices = [];
  List<ServiceListingModel> get popularServices => _popularServices;

  ProviderProfileModel? _selectedProvider;
  ProviderProfileModel? get selectedProvider => _selectedProvider;

  List<ServiceListingModel> _selectedProviderServices = [];
  List<ServiceListingModel> get selectedProviderServices => _selectedProviderServices;

  Future<void> searchProviders({String? searchTerm, String? categoryId}) async {
    _setLoading(true);
    try {
      _searchResults = await providerRepo.searchProviders(
        searchTerm: searchTerm,
        serviceCategoryId: categoryId,
      );
      _errorMessage = null;
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  Future<void> searchServices({String? query, String? categoryId}) async {
    _setLoading(true);
    try {
      _serviceSearchResults = await serviceListingRepo.searchListings(
        query: query,
        categoryId: categoryId,
      );
      _errorMessage = null;
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadHomepageData() async {
    _setLoading(true);
    try {
      _topProviders = await providerRepo.searchProviders();
      _popularServices = await serviceListingRepo.searchListings();
      _errorMessage = null;
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  Future<void> fetchProviderProfile(String id) async {
    _setLoading(true);
    try {
      _selectedProvider = await providerRepo.getProviderProfile(id);
      _selectedProviderServices = await serviceListingRepo.getProviderListings(id);
      _errorMessage = null;
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _setLoading(false);
    }
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }
}
