using System;
using Microsoft.Extensions.Configuration;
using Amazon.Textract;
using Amazon.Textract.Model;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace parser {
	class Program {
		const string BucketName = "<your-bucket-name>";
		const string FormFile = "employmentapp.png";
		static void Main(string[] args) {
			var textractAnalysisClient = BuildTextractClient();
			var document = PrepareDocument(textractAnalysisClient, "FORMS");
			document.Pages.ForEach(page => {
				Console.WriteLine("Print Lines and Words:");
				page.Lines.ForEach(line => {
					Console.WriteLine("{0}--{1}", line.Text, line.Confidence);
					line.Words.ForEach(word => {
						Console.WriteLine("{0}--{1}", word.Text, word.Confidence);
					});
				});
				Console.WriteLine("Print Fields:");
				page.Form.Fields.ForEach(f => {
					Console.WriteLine("Field: Key: {0}, Value {1}", f.Key, f.Value);
				});
				Console.WriteLine("Get Field by Key:");
				var key = "Phone Number:";
				var field = page.Form.GetFieldByKey(key);
				if(field != null) {
					Console.WriteLine("Field: Key: {0}, Value: {1}", field.Key, field.Value);
				}
			});

			document = PrepareDocument(textractAnalysisClient, "TABLES");
			document.Pages.ForEach(page => {
				page.Tables.ForEach(table => {
					var r = 0;
					table.Rows.ForEach(row => {
						r++;
						var c = 0;
						row.Cells.ForEach(cell => {
							c++;
							Console.WriteLine("Table [{0}][{1}] = {2}--{3}", r, c, cell.Text, cell.Confidence);
						});
					});
				});
			});
		}

		static TextractDocument PrepareDocument(TextractTextAnalysisService textractAnalysisClient, string type) {
			var task = textractAnalysisClient.StartDocumentAnalysis(BucketName, FormFile, type);
			var jobId = task.Result;
			textractAnalysisClient.WaitForJobCompletion(jobId);
			var results = textractAnalysisClient.GetJobResults(jobId);
			return new TextractDocument(results);
		}

		static TextractTextAnalysisService BuildTextractClient() {
			var builder = new ConfigurationBuilder()
				.SetBasePath(Environment.CurrentDirectory)
				.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
				.AddEnvironmentVariables()
				.Build();
			var awsOptions = builder.GetAWSOptions();
			return new TextractTextAnalysisService(awsOptions.CreateServiceClient<IAmazonTextract>());
		}
	}

	public class TextractTextAnalysisService {
		private IAmazonTextract textract;
		public TextractTextAnalysisService(IAmazonTextract textract) {
			this.textract = textract;
		}
		public GetDocumentAnalysisResponse GetJobResults(string jobId) {
			var response = this.textract.GetDocumentAnalysisAsync(new GetDocumentAnalysisRequest {
				JobId = jobId
			});
			response.Wait();
			return response.Result;
		}

		public bool IsJobComplete(string jobId) {
			var response = this.textract.GetDocumentAnalysisAsync(new GetDocumentAnalysisRequest {
				JobId = jobId
			});
			response.Wait();
			return !response.Result.JobStatus.Equals("IN_PROGRESS");
		}

		public async Task<string> StartDocumentAnalysis(string bucketName, string key, string featureType) {
			var request = new StartDocumentAnalysisRequest();
			var s3Object = new S3Object {
				Bucket = bucketName,
				Name = key
			};
			request.DocumentLocation = new DocumentLocation {
				S3Object = s3Object
			};
			request.FeatureTypes = new List<string> { featureType };
			var response = await this.textract.StartDocumentAnalysisAsync(request);
			return response.JobId;
		}

		public void WaitForJobCompletion(string jobId, int delay = 5000) {
			while(!IsJobComplete(jobId)) {
				this.Wait(delay);
			}
		}

		private void Wait(int delay = 5000) {
			Task.Delay(delay).Wait();
			Console.Write(".");
		}
	}
}
