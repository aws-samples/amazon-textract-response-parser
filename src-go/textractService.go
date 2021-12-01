package trp

import (
	"context"
	"fmt"
	"github.com/aws/aws-sdk-go/service/textract"
	"github.com/aws/aws-sdk-go/service/textract/textractiface"
	"time"
)

var svc textractiface.TextractAPI

func TextractAnalysisService(service textractiface.TextractAPI) {
	svc = service
}

func GetJobResults(jobId *string) *textract.GetDocumentAnalysisOutput {
	ctx, cancelFunction := context.WithTimeout(context.Background(), 500)

	defer func() {
		fmt.Println("Document Analysis Results Collected.")
		cancelFunction()
	}()

	ch := make(chan bool)
	go IsJobComplete(ctx, jobId, ch)

	var output *textract.GetDocumentAnalysisOutput
	var err error

	if <-ch {
		ctx.Done()
		output, err = svc.GetDocumentAnalysis(&textract.GetDocumentAnalysisInput{
			JobId: jobId,
		})
		if err != nil {
			_ = fmt.Errorf("encountered an error %s", err)
			return nil
		}
		return output
	} else {
		return nil
	}
}

func IsJobComplete(context context.Context, jobId *string, ch chan bool) {

	isComplete := false
	defer func() {
		fmt.Println("go subroutine IsJobComplete complete")
	}()

	for !isComplete {
		fmt.Println("checking status of job " + *jobId)
		response, err := svc.GetDocumentAnalysis(&textract.GetDocumentAnalysisInput{
			JobId: jobId,
		})
		if err != nil {
			_ = fmt.Errorf("encountered an error %s", err)
			context.Done()
		}
		if *response.JobStatus == "SUCCEEDED" {
			isComplete = true
		} else {
			time.Sleep(5000000000) // 5 seconds
		}
	}
	ch <- true
}

func StartDocumentAnalysis(bucketName *string, key *string, featureType *string) *string{
	var featureList []*string
	featureList = append(featureList, featureType)
	request := &textract.StartDocumentAnalysisInput{
		DocumentLocation:    &textract.DocumentLocation{
			S3Object: &textract.S3Object{
				Bucket:  bucketName,
				Name:    key,
			},
		},
		FeatureTypes:        featureList,
	}

	response, err := svc.StartDocumentAnalysis(request)
	if err != nil {
		_ = fmt.Errorf("encountered an error %s", err)
		return nil
	}
	return response.JobId
}