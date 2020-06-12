var stackArgs = cla.getConfig({
	stackParams: {
		functionName: {
			desc: "MapTask Creator",
			getter: function(v) {
				return v + "-" + this.tags.Project.toLowerCase() + this.tags.Environment.toLowerCase();
			},
		},
	},
});
stackUtils.include("here-cicd/templates/lambdaTemplate");

var stackTemplate = {
	AWSTemplateFormatVersion: "2010-09-09",
	Description: "MapTask Creator",
	Parameters: {
		hereLiveMapSnsArn: {
			Type: "String",
			Description: "Arn of HERE Live Map Feature SNS",
		},
	},
	Resources: {
		HereLiveMapSNSSubscription: {
			Type: "AWS::SNS::Subscription",
			Properties: {
				Protocol: "lambda",
				Endpoint: {
					"Fn::GetAtt": ["LambdaFunction", "Arn"],
				},
				TopicArn: {
					Ref: "hereLiveMapSnsArn",
				},
				Region: "us-east-1",
				FilterPolicy: {
					space: [
						"xGBJ0MJG", // Road
						"47qHNBy8", // Place
						"EHaVKTS0", // Address
						"HuZD8QSL", // Building
					],
					featureType: ["Road", "Place", "Address", "Building"],
					spaceType: ["VIOLATION_DELTA", "VIOLATION_BASE"],
					operation: ["CREATE", "UPDATE", "DELETE"],
					// "reviewState": [
					// 	"AUTO_REVIEW_DEFERRED",
					// 	"INTEGRATED"
					// ]
				},
			},
		},
		MapTaskCreatorLambdaInvokePermission: {
			Type: "AWS::Lambda::Permission",
			Properties: {
				Action: "lambda:InvokeFunction",
				Principal: "sns.amazonaws.com",
				SourceArn: {
					Ref: "hereLiveMapSnsArn",
				},
				FunctionName: {
					"Fn::GetAtt": ["LambdaFunction", "Arn"],
				},
			},
		},
	},
	Outputs: {},
};

stackUtils.assembleStackTemplate(stackTemplate, module);
