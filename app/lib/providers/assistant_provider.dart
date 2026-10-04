import 'package:flutter/material.dart';
import '../data/models/assistant_message_model.dart';
import '../data/repositories/assistant_repository.dart';

class AssistantProvider extends ChangeNotifier {
  final AssistantRepository repository;

  final List<AssistantMessageModel> _messages = [];
  bool _isTyping = false;

  AssistantProvider({required this.repository}) {
    _initWelcome();
  }

  List<AssistantMessageModel> get messages => _messages;
  bool get isTyping => _isTyping;

  void _initWelcome() {
    _messages.add(
      AssistantMessageModel.assistant(
        'Hello! I am your Handee AI Assistant. I can help you find verified tradespeople, estimate service costs, or discover services anywhere in Sri Lanka.',
        suggestions: [
          'Find a Plumber in Colombo',
          'AC Service & Repair cost',
          'Electrician rates in Colombo',
          'How does Handee verification work?',
        ],
      ),
    );
  }

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    final userMsg = AssistantMessageModel.user(text.trim());
    _messages.add(userMsg);
    _isTyping = true;
    notifyListeners();

    try {
      final reply = await repository.queryAssistant(text);
      _isTyping = false;
      _messages.add(reply);
      notifyListeners();
    } catch (e) {
      _isTyping = false;
      _messages.add(
        AssistantMessageModel.assistant(
          'I encountered a brief connection issue. However, you can browse verified categories or search for specialists directly.',
          suggestions: ['Browse Plumbing', 'Browse Electrical', 'View AC Specialists'],
        ),
      );
      notifyListeners();
    }
  }

  void clearConversation() {
    _messages.clear();
    _initWelcome();
    notifyListeners();
  }
}
