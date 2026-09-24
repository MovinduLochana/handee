import 'package:flutter/foundation.dart';
import '../data/models/service_category_model.dart';
import '../data/repositories/service_category_repository.dart';

class ServiceCategoryProvider extends ChangeNotifier {
  final ServiceCategoryRepository repository;

  ServiceCategoryProvider({required this.repository}) {
    fetchCategories();
  }

  List<ServiceCategoryModel> _categories = [];
  List<ServiceCategoryModel> get categories => _categories;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  Future<void> fetchCategories() async {
    if (_categories.isNotEmpty) return; // Prevent refetching unnecessarily

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _categories = await repository.getCategories();
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
