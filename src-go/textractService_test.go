package trp

import (
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/textract"
	"gopkg.in/yaml.v2"
	"io/ioutil"
	"log"
	"path/filepath"
	"runtime"
	"testing"
)

var c testConfig
var testConfigFile = "test/testConfig.yaml"

type testConfig struct {
	Region				string `yaml:"region"`
	Profile				string `yaml:"profile"`
	BucketToTest		string `yaml:"bucketToTest"`
	KeyToTest			string `yaml:"keyToTest"`
	FeaturesListItem	string `yaml:"featuresListItem"`
}

func (c *testConfig) getConfig(fileName string) *testConfig {
	_, b, _, _ := runtime.Caller(0)
	file, err := ioutil.ReadFile(filepath.Dir(b) + "/" + fileName)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("\n%#v\n", string(file))
	err = yaml.Unmarshal(file, c)
	if err != nil {
		return nil
	}

	return c
}

func connectToTextract(config *testConfig) {
	localSession := session.Must(
		session.NewSession(&aws.Config{
			Credentials: credentials.NewSharedCredentials("", config.Profile),
			Region:      &config.Region,
		}),
	)
	mockSvc := textract.New(localSession)
	TextractAnalysisService(mockSvc)
}

func TestStartDocumentAnalysis(t *testing.T) {
	config := c.getConfig(testConfigFile)
	connectToTextract(config)

	jobId := StartDocumentAnalysis(&config.BucketToTest, &config.KeyToTest, &config.FeaturesListItem)
	if jobId == nil || *jobId == "" {
		t.Fail()
	}
}

func TestGetJobResultsAsync(t *testing.T) {
	config := c.getConfig(testConfigFile)
	connectToTextract(config)

	jobId := StartDocumentAnalysis(&config.BucketToTest, &config.KeyToTest, &config.FeaturesListItem)
	if jobId == nil || *jobId == "" {
		t.Fail()
	}

	output := GetJobResults(jobId)
	if *output.JobStatus != "SUCCEEDED" {
		t.Fail()
	}
}