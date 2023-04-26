import json
from mapping import Document


def run():
    file_path = "loan-app-response.json"
    with open(file_path, 'r') as document:
        data = json.loads(document.read())
        document = Document(data)
        raw_text = ' '.join(document['words'])
        # print(raw_text)
        # "Text": "Uniform Residential Loan Application This application is designed to be completed by the
        # applicant(s) with the Lender's assistance. Applicants should complete this form as \"Borrower\" or
        # \"Co-Borrower\", as applicable. Co-Borrower information must also be provided (and the appropriate box
        # checked) when the income or assets of a person other than the \"Borrower\" (including the Borrower's
        # spouse) will be used as a basis for loan qualification or the income or assets of the Borrower's spouse or
        # other person who has community property rights pursuant to state law will not be used as a basis for loan
        # qualification, but his or her liabilities must be considered because the spouse or other person has
        # community property rights pursuant to applicable law and Borrower resides in a community property state,
        # the security property is located in a community property state, or the Borrower is relying on other
        # property located in a community property state as a basis for repayment of the loan. If this is an
        # application for joint credit, Borrower and Co-Borrower each agree that we intend to apply for joint credit
        # (sign below): Borrower Co-Borrower I. TYPE OF MORTGAGE AND TERMS OF LOAN Mortgage VA Conventional Other (
        # explain): Agency Case Number Lender Case Number Applied for: FHA USDA/Rural ABC1234 XYZ6543 Housing Service
        # Amount Interest Rate No. of Months Amortization Type: Fixed Rate Other (explain): $ 552,500 3.5 % 360 GPM
        # ARM (type): II. PROPERTY INFORMATION AND PURPOSE OF LOAN Subject Property Address (street, city, state,
        # & ZIP) No. of Units 123 Any Street, Anytown, USA, 12345 1 Legal Description of Subject Property (attach
        # description if necessary) Year Built Single Family Home 2015 Purpose of Loan Purchase Construction Other (
        # explain): Property will be: Refinance Construction-Permanent Primary Residence Secondary Residence
        # Investment Complete this line if construction or construction-permanent loan. Year Lot Original Cost Amount
        # Existing Liens (a) Present Value of Lot (b) Cost of Improvements Total (a+b) Acquired $ $ $ $ $ Complete
        # this line if this is a refinance loan. Year Original Cost Amount Existing Liens Purpose of Refinance
        # Describe Improvements made to be made Acquired $ $ Cost: $ Title will be held in what Name(s) Manner in
        # which Title will be held Estate will be held in: Carlos Salazar Fee Simple Leasehold(show Source of Down
        # Payment Settlement Charges and/or Subordinate Financing (explain) expiration date) Salary + Savings
        # Borrower III. BORROWER INFORMATION Co-Borrower Borrower's Name (include Jr. or Sr. if applicable)
        # Co-Borrower's Name (include Jr. or Sr. if applicable) Carlos Salazar N/A Social Security Number Home Phone
        # (incl. area code) DOB (mm/dd/yyyy) Yrs. School Social Security Number Home Phone (incl. area code) DOB (
        # mm/dd/yyyy) Yrs. School 999-99-9999 +1 123-456-7890 1/18/1958 12 N/A N/A N/A N/A Dependents (not listed by
        # Dependents (not listed by Married (includes registered domestic partners) Co-Borrower) Married (includes
        # registered domestic partners) Borrower) Unmarried (includes single, divorced, widowed) No. 0 Unmarried (
        # includes single, divorced, widowed) No. N/A Separated Ages N/A Separated Ages N/A Present Address (street,
        # city, state, ZIP/ country) Own Rent 5 No. Yrs. Present Address (street, city, state, ZIP/ country) Own Rent
        # No. Yrs. 456 Any Street, Anytown, USA, 12345 N/A Mailing Address, if different from Present Address Mailing
        # Address, if different from Present Address N/A If residing at present address for less than two years,
        # complete the following: Former Address (street, city, state, ZIP) Own Rent No. Yrs. Former Address (street,
        # city, state, ZIP) Own Rent No. Yrs. N/A N/A Former Address (street, city, state, ZIP) Own Rent No. Yrs.
        # Former Address (street, city, state, ZIP) Own Rent No. Yrs. N/A N/A\n", After running comprehend
        comprehend_response = {
            "Entities": [
                {
                    "Score": 0.9366451501846313,
                    "Type": "QUANTITY",
                    "Text": "each",
                    "BeginOffset": 1058,
                    "EndOffset": 1062
                },
                {
                    "Score": 0.7331190705299377,
                    "Type": "OTHER",
                    "Text": "FHA USDA",
                    "BeginOffset": 1276,
                    "EndOffset": 1284
                },
                {
                    "Score": 0.6855641603469849,
                    "Type": "OTHER",
                    "Text": "ABC1234 XYZ6543",
                    "BeginOffset": 1291,
                    "EndOffset": 1306
                },
                {
                    "Score": 0.9977587461471558,
                    "Type": "QUANTITY",
                    "Text": "$ 552,500",
                    "BeginOffset": 1405,
                    "EndOffset": 1414
                },
                {
                    "Score": 0.9303759932518005,
                    "Type": "QUANTITY",
                    "Text": "3.5 %",
                    "BeginOffset": 1415,
                    "EndOffset": 1420
                },
                {
                    "Score": 0.708534300327301,
                    "Type": "QUANTITY",
                    "Text": "360 GPM",
                    "BeginOffset": 1421,
                    "EndOffset": 1428
                },
                {
                    "Score": 0.8506087064743042,
                    "Type": "OTHER",
                    "Text": "Units 123",
                    "BeginOffset": 1547,
                    "EndOffset": 1556
                },
                {
                    "Score": 0.7548143267631531,
                    "Type": "LOCATION",
                    "Text": "Any Street, Anytown, USA, 12345",
                    "BeginOffset": 1557,
                    "EndOffset": 1588
                },
                {
                    "Score": 0.9971926808357239,
                    "Type": "DATE",
                    "Text": "2015",
                    "BeginOffset": 1693,
                    "EndOffset": 1697
                },
                {
                    "Score": 0.9903680086135864,
                    "Type": "PERSON",
                    "Text": "Carlos Salazar",
                    "BeginOffset": 2309,
                    "EndOffset": 2323
                },
                {
                    "Score": 0.9962449669837952,
                    "Type": "PERSON",
                    "Text": "Carlos Salazar",
                    "BeginOffset": 2617,
                    "EndOffset": 2631
                },
                {
                    "Score": 0.5208863019943237,
                    "Type": "ORGANIZATION",
                    "Text": "N/A",
                    "BeginOffset": 2632,
                    "EndOffset": 2635
                },
                {
                    "Score": 0.5437430143356323,
                    "Type": "ORGANIZATION",
                    "Text": "Yrs.",
                    "BeginOffset": 2786,
                    "EndOffset": 2790
                },
                {
                    "Score": 0.9814861416816711,
                    "Type": "OTHER",
                    "Text": "999-99-9999",
                    "BeginOffset": 2798,
                    "EndOffset": 2809
                },
                {
                    "Score": 0.9224309921264648,
                    "Type": "OTHER",
                    "Text": "+1 123-456-7890 1/18/1958",
                    "BeginOffset": 2810,
                    "EndOffset": 2835
                },
                {
                    "Score": 0.6254334449768066,
                    "Type": "OTHER",
                    "Text": "12",
                    "BeginOffset": 2836,
                    "EndOffset": 2838
                },
                {
                    "Score": 0.589428186416626,
                    "Type": "TITLE",
                    "Text": "N/A",
                    "BeginOffset": 2839,
                    "EndOffset": 2842
                },
                {
                    "Score": 0.49809491634368896,
                    "Type": "OTHER",
                    "Text": "No. 0",
                    "BeginOffset": 3073,
                    "EndOffset": 3078
                },
                {
                    "Score": 0.6882924437522888,
                    "Type": "QUANTITY",
                    "Text": "Rent",
                    "BeginOffset": 3228,
                    "EndOffset": 3232
                },
                {
                    "Score": 0.7337660789489746,
                    "Type": "QUANTITY",
                    "Text": "5 No.",
                    "BeginOffset": 3233,
                    "EndOffset": 3238
                },
                {
                    "Score": 0.7708538770675659,
                    "Type": "OTHER",
                    "Text": "456",
                    "BeginOffset": 3314,
                    "EndOffset": 3317
                },
                {
                    "Score": 0.8818538188934326,
                    "Type": "LOCATION",
                    "Text": "Anytown, USA, 12345 N/A",
                    "BeginOffset": 3330,
                    "EndOffset": 3353
                },
                {
                    "Score": 0.9935828447341919,
                    "Type": "QUANTITY",
                    "Text": "less than two years",
                    "BeginOffset": 3495,
                    "EndOffset": 3514
                }
            ]
        }
        # Merge the two objects (comprehend_response and document['wordsObjects])

        for entity in comprehend_response['Entities']:
            begin_offset = entity['BeginOffset']
            end_offset = entity['EndOffset']
            begin_word = raw_text[begin_offset:end_offset]
            whole_sentence_split = begin_word.split(" ")
            begin_word_index = document['words'].index(whole_sentence_split[0])
            end_word_index = begin_word_index + len(whole_sentence_split) + 1
            for i in range(begin_word_index, end_word_index):
                print(document['wordsObjects'][i], "wordsObjects - before")
                # {'BlockType': 'WORD', 'Confidence': 99.9372329711914, 'Geometry': {'BoundingBox': {'Height':
                # 0.011532648466527462, 'Left': 0.3643971383571625, 'Top': 0.8954669833183289,
                # 'Width': 0.058403607457876205}, 'Polygon': [{'X': 0.3643971383571625, 'Y': 0.8954669833183289},
                # {'X': 0.42279788851737976, 'Y': 0.8955075144767761}, {'X': 0.422800749540329,
                # 'Y': 0.9069996476173401}, {'X': 0.36439958214759827, 'Y': 0.9069589376449585}]},
                # 'Id': '9bd4d3a3-8842-4ec9-89dc-98b064ebed3f', 'Text': 'complete', 'TextType': 'PRINTED'}
                document['wordsObjects'][i]['Entities'] = entity
                print(document['wordsObjects'][i], "wordsObjects - after")
                # {'BlockType': 'WORD', 'Confidence': 99.9372329711914, 'Geometry': {'BoundingBox': {'Height':
                # 0.011532648466527462, 'Left': 0.3643971383571625, 'Top': 0.8954669833183289,
                # 'Width': 0.058403607457876205}, 'Polygon': [{'X': 0.3643971383571625, 'Y': 0.8954669833183289},
                # {'X': 0.42279788851737976, 'Y': 0.8955075144767761}, {'X': 0.422800749540329,
                # 'Y': 0.9069996476173401}, {'X': 0.36439958214759827, 'Y': 0.9069589376449585}]},
                # 'Id': '9bd4d3a3-8842-4ec9-89dc-98b064ebed3f', 'Text': 'complete', 'TextType': 'PRINTED',
                # 'Entities': {'Score': 0.9935828447341919, 'Type': 'QUANTITY', 'Text': 'less than two years',
                # 'BeginOffset': 3495, 'EndOffset': 3514}}


run()
