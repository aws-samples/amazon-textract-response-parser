# Usage

## Forms

```go
bucket := "BUCKET"
key := "KEY"
feature := "FORMS"
jobId := StartDocumentAnalysis(&bucket, &key, &feature)
	if *jobId == "" {
		t.Fail()
	}

	output := GetJobResults(jobId)
	if *output.JobStatus != "SUCCEEDED" {
		t.Fail()
	}
```

## Tables

```go
bucket := "BUCKET"
key := "KEY"
feature := "TABLES"
jobId := StartDocumentAnalysis(&bucket, &key, &feature)
	if *jobId == "" {
		t.Fail()
	}

	output := GetJobResults(jobId)
	if *output.JobStatus != "SUCCEEDED" {
		t.Fail()
	}
```

# Test

## Prerequisites

- [Install](https://go.dev/doc/install) GoLang
- [Install](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
  and
  [Configure](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)
  AWS CLI

Then

- Download source code to your local machine
- Populate the `test/testConfig.yaml` file with the proper configuration settings 
- Run the following at a command line inside the source code folder to execute

```
go test
```