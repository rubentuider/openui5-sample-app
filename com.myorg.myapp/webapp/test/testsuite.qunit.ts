export default {
	name: "QUnit test suite for the UI5 Application: com.myorg.myapp",
	defaults: {
		page: "ui5://test-resources/com/myorg/myapp/Test.qunit.html?testsuite={suite}&test={name}",
		qunit: {
			version: 2
		},
		sinon: {
			version: 4
		},
		ui5: {
			language: "EN",
			theme: "sap_horizon"
		},
		coverage: {
			only: "com/myorg/myapp/",
			never: "test-resources/com/myorg/myapp/"
		},
		loader: {
			paths: {
				"com/myorg/myapp": "../"
			}
		}
	},
	tests: {
		"unit/unitTests": {
			title: "Unit tests for com.myorg.myapp"
		},
		"integration/opaTests": {
			title: "Integration tests for com.myorg.myapp"
		}
	}
};
