/**
 * Atreus Validator
 * Runtime validation of Atreus integrity
 */

import { PAGE_TYPES, PAGE_GREETINGS, PAGE_SUGGESTIONS, ROLE_TYPES, validateAtreusConfig } from './atreusConfig';
import { atreusLogger } from './atreusLogger';

export class AtreusValidator {
  static validateContext(context) {
    if (!context) {
      atreusLogger.warning('Context is undefined');
      return { isValid: false, errors: ['Context is undefined'] };
    }

    const errors = [];
    
    // Validate pageType
    if (!context.pageType) {
      errors.push('pageType is missing from context');
    } else if (!Object.values(PAGE_TYPES).includes(context.pageType)) {
      errors.push(`Unknown pageType: ${context.pageType}`);
    }
    
    return { isValid: errors.length === 0, errors };
  }

  static validateRole(role) {
    if (!role) {
      return { isValid: false, errors: ['Role is undefined'] };
    }

    const errors = [];
    
    if (!Object.values(ROLE_TYPES).includes(role)) {
      errors.push(`Unknown role: ${role}`);
    }
    
    return { isValid: errors.length === 0, errors };
  }

  static validateSuggestions(suggestions) {
    if (!Array.isArray(suggestions)) {
      return { isValid: false, errors: ['Suggestions must be an array'] };
    }

    const errors = [];
    
    suggestions.forEach((suggestion, index) => {
      if (!suggestion.text) {
        errors.push(`Suggestion ${index} missing text`);
      }
      if (!suggestion.icon) {
        errors.push(`Suggestion ${index} missing icon`);
      }
    });
    
    return { isValid: errors.length === 0, errors };
  }

  static validateConversation(conversation) {
    if (!conversation) {
      return { isValid: false, errors: ['Conversation is undefined'] };
    }

    const errors = [];
    
    if (!conversation.id) {
      errors.push('Conversation missing id');
    }
    
    if (!Array.isArray(conversation.messages)) {
      errors.push('Conversation messages must be an array');
    }
    
    if (conversation.messages) {
      conversation.messages.forEach((msg, index) => {
        if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
          errors.push(`Message ${index} has invalid role: ${msg.role}`);
        }
        if (!msg.content) {
          errors.push(`Message ${index} missing content`);
        }
        if (!msg.timestamp) {
          errors.push(`Message ${index} missing timestamp`);
        }
      });
    }
    
    return { isValid: errors.length === 0, errors };
  }

  static runFullValidation() {
    atreusLogger.info('Running full Atreus validation...');
    
    const results = {
      config: validateAtreusConfig(),
      timestamp: new Date().toISOString()
    };
    
    if (results.config.isValid) {
      atreusLogger.success('✅ Atreus configuration is valid');
    } else {
      atreusLogger.error('❌ Atreus configuration has errors', results.config.errors);
    }
    
    if (results.config.warnings.length > 0) {
      atreusLogger.warning('⚠️ Atreus configuration has warnings', results.config.warnings);
    }
    
    return results;
  }
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.AtreusValidator = AtreusValidator;
}