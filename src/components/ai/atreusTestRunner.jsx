/**
 * Atreus Test Runner
 * Automated tests for Atreus functionality
 */

import { PAGE_TYPES, PAGE_GREETINGS, PAGE_SUGGESTIONS, ROLE_TYPES } from './atreusConfig';
import { AtreusValidator } from './atreusValidator';
import { atreusLogger } from './atreusLogger';

export class AtreusTestRunner {
  constructor() {
    this.results = [];
  }

  async runAllTests() {
    atreusLogger.info('🚀 Starting Atreus test suite...');
    
    this.results = [];
    
    // Configuration tests
    await this.testConfiguration();
    
    // Context tests
    await this.testContextValidation();
    
    // Role tests
    await this.testRoleValidation();
    
    // Integration tests
    await this.testIntegration();
    
    // Generate report
    return this.generateReport();
  }

  async testConfiguration() {
    atreusLogger.info('Testing configuration...');
    
    const test = {
      suite: 'Configuration',
      tests: []
    };

    // Test 1: Validate config
    const configValidation = AtreusValidator.runFullValidation();
    test.tests.push({
      name: 'Config validation',
      passed: configValidation.config.isValid,
      errors: configValidation.config.errors,
      warnings: configValidation.config.warnings
    });

    // Test 2: All page types have greetings
    const missingGreetings = Object.values(PAGE_TYPES).filter(
      pageType => !PAGE_GREETINGS[pageType]
    );
    test.tests.push({
      name: 'All page types have greetings',
      passed: missingGreetings.length === 0,
      errors: missingGreetings.map(pt => `Missing greeting for ${pt}`)
    });

    // Test 3: All page types have suggestions
    const missingSuggestions = Object.values(PAGE_TYPES).filter(
      pageType => !PAGE_SUGGESTIONS[pageType]
    );
    test.tests.push({
      name: 'All page types have suggestions',
      passed: missingSuggestions.length === 0,
      warnings: missingSuggestions.map(pt => `Missing suggestions for ${pt}`)
    });

    this.results.push(test);
  }

  async testContextValidation() {
    atreusLogger.info('Testing context validation...');
    
    const test = {
      suite: 'Context Validation',
      tests: []
    };

    // Test valid contexts
    Object.values(PAGE_TYPES).forEach(pageType => {
      const context = { pageType };
      const validation = AtreusValidator.validateContext(context);
      test.tests.push({
        name: `Valid context for ${pageType}`,
        passed: validation.isValid,
        errors: validation.errors
      });
    });

    // Test invalid contexts
    const invalidContexts = [
      { pageType: 'invalid-page' },
      {},
      null
    ];

    invalidContexts.forEach((context, index) => {
      const validation = AtreusValidator.validateContext(context);
      test.tests.push({
        name: `Invalid context ${index + 1} caught`,
        passed: !validation.isValid,
        errors: validation.isValid ? ['Should have failed but passed'] : []
      });
    });

    this.results.push(test);
  }

  async testRoleValidation() {
    atreusLogger.info('Testing role validation...');
    
    const test = {
      suite: 'Role Validation',
      tests: []
    };

    // Test valid roles
    Object.values(ROLE_TYPES).forEach(role => {
      const validation = AtreusValidator.validateRole(role);
      test.tests.push({
        name: `Valid role ${role}`,
        passed: validation.isValid,
        errors: validation.errors
      });
    });

    // Test invalid roles
    const invalidRoles = ['Invalid Role', null, undefined];
    invalidRoles.forEach((role, index) => {
      const validation = AtreusValidator.validateRole(role);
      test.tests.push({
        name: `Invalid role ${index + 1} caught`,
        passed: !validation.isValid,
        errors: validation.isValid ? ['Should have failed but passed'] : []
      });
    });

    this.results.push(test);
  }

  async testIntegration() {
    atreusLogger.info('Testing integration...');
    
    const test = {
      suite: 'Integration',
      tests: []
    };

    // Test conversation validation
    const validConversation = {
      id: 'test-123',
      messages: [
        { role: 'user', content: 'Test', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'Response', timestamp: new Date().toISOString() }
      ]
    };

    const validation = AtreusValidator.validateConversation(validConversation);
    test.tests.push({
      name: 'Valid conversation structure',
      passed: validation.isValid,
      errors: validation.errors
    });

    // Test invalid conversation
    const invalidConversation = {
      messages: [
        { role: 'invalid', content: 'Test' }
      ]
    };

    const invalidValidation = AtreusValidator.validateConversation(invalidConversation);
    test.tests.push({
      name: 'Invalid conversation caught',
      passed: !invalidValidation.isValid,
      errors: invalidValidation.isValid ? ['Should have failed'] : []
    });

    this.results.push(test);
  }

  generateReport() {
    const totalTests = this.results.reduce(
      (sum, suite) => sum + suite.tests.length,
      0
    );
    
    const passedTests = this.results.reduce(
      (sum, suite) => sum + suite.tests.filter(t => t.passed).length,
      0
    );
    
    const failedTests = totalTests - passedTests;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: ((passedTests / totalTests) * 100).toFixed(2) + '%'
      },
      suites: this.results
    };

    // Console output
    console.log('%c=== ATREUS TEST REPORT ===', 'font-size: 16px; font-weight: bold; color: #8b5cf6');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`%c✅ Passed: ${passedTests}`, 'color: #10b981');
    console.log(`%c❌ Failed: ${failedTests}`, 'color: #ef4444');
    console.log(`Pass Rate: ${report.summary.passRate}`);
    
    this.results.forEach(suite => {
      console.group(`${suite.suite}`);
      suite.tests.forEach(test => {
        const icon = test.passed ? '✅' : '❌';
        const color = test.passed ? '#10b981' : '#ef4444';
        console.log(`%c${icon} ${test.name}`, `color: ${color}`);
        if (test.errors && test.errors.length > 0) {
          console.log('  Errors:', test.errors);
        }
        if (test.warnings && test.warnings.length > 0) {
          console.log('  Warnings:', test.warnings);
        }
      });
      console.groupEnd();
    });
    
    atreusLogger.success('Test suite completed', report.summary);
    
    return report;
  }

  exportReport() {
    const report = this.generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atreus-test-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.AtreusTestRunner = AtreusTestRunner;
  
  // Add convenient test command
  window.runAtreusTests = async () => {
    const runner = new AtreusTestRunner();
    return await runner.runAllTests();
  };
}