# Textract-Augmented AI (A2I) Human Review Response Parser

You can use Textract-Amazon Augmented AI (A2I) response parser library to easily parser JSON returned by A2I human review workflow . Library parses JSON and provides programming language specific constructs to work with different parts of the document. 

## Python Usage

```
# Call Amazon Textract with A2I HumanLoop Config and get JSON response
#  client = boto3.client('textract')
#  response = client.analyze_document(Document={...}, FeatureTypes=[...], HumanLoopConfig={...})
#
# Check if Human Loop was started
#  if 'HumanLoopArn' in response['HumanLoopActivationOutput']:
#       print(f'A human loop has been started with ARN: {response["HumanLoopActivationOutput"]["HumanLoopArn"]}')  
#
# Once human review is complete, retrieve the human review results stored in S3 bucket
#  a2i_runtime_client = boto3.client('sagemaker-a2i-runtime', REGION)
#  describe_human_loop_response = a2i_runtime_client.describe_human_loop(
#       HumanLoopName=human_loop_name
#  )
#  a2i_s3_output_uri = describe_human_loop_response['HumanLoopOutput']['OutputS3Uri']
# Split the bucket and object key from the a2i_s3_output_uri
#
# Gets the json file published by A2I and returns a deserialized object
#   s3_content = s3.get_object(Bucket=bucket, Key=output_bucket_key)
#   a2i_json = json.loads(s3_content['Body'].read().decode('utf-8'))
#   a2i_response = a2i_json["humanAnswers"][0]["answerContent"]["AWS/Textract/AnalyzeDocument/Forms/V1"]
#
# Parse JSON response from Textract
doc = Document(a2i_response)

# Iterate over elements in the document
for page in doc.pages:
        print("PAGE\n====================")
        print("Form (key/values)\n====================")
        for field in page.form.fields:
            k = ""
            v = ""
            if(field.key):
                k = field.key.text
            if(field.value):
                v = field.value.text
            print("Field: Key: {}, Value: {}".format(k,v))

        #Get field by key
        key = "Policy Number:"
        print("\nGet field by key ({}):\n====================".format(key))
        f = page.form.getFieldByKey(key)
        if(f):
            print("Field: Key: {}, Value: {}".format(f.key.text, f.value.text))

        #Search field by key
        key = "Policy Number:"
        print("\nSearch field by key ({}):\n====================".format(key))
        fields = page.form.searchFieldsByKey(key)
        for field in fields:
            print("Field: Key: {}, Value: {}".format(field.key, field.value))

```


## Test

- Download [code](.) on your local machine.
- Run "python3 a2irptest.py"
- You should see output using the sample JSON response file included in the source.

## Other Resources

- [Using Amazon Textract with Amazon Augmented AI for processing critical documents](https://aws.amazon.com/blogs/machine-learning/using-amazon-textract-with-amazon-augmented-ai-for-processing-critical-documents/)
- [Amazon Augmented AI (Amazon A2I) integration with Amazon Textract's Analyze Document Example](https://github.com/aws-samples/amazon-a2i-sample-jupyter-notebooks/blob/master/Amazon%20Augmented%20AI%20(A2I)%20and%20Textract%20AnalyzeDocument.ipynb)

## License Summary

This sample code is made available under the MIT-0 license. See the LICENSE file.
