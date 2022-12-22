import os
import sys
from setuptools import setup


def read(fname):
    return open(os.path.join(os.path.dirname(__file__), fname)).read()


requirements = ['boto3', 'marshmallow==3.14.1']

if sys.argv[-1] == 'publish-test':
    os.system(f"cd {os.path.dirname(__file__)}")
    os.system('rm -rf dist/ build/ amazon_textract_response_parser.egg-info/')
    os.system('python3 setup.py sdist bdist_wheel')
    os.system('twine check dist/*')
    os.system('twine upload --repository pypitest dist/*')
    sys.exit()

if sys.argv[-1] == 'publish':
    script_path = str(f"cd {os.path.dirname(__file__)}")
    os.system(script_path)
    os.system('rm -rf dist/ build/ amazon_textract_response_parser.egg-info/')
    os.system('python3 setup.py sdist bdist_wheel')
    os.system('twine check dist/*')
    os.system('twine upload --repository pypi dist/*')
    sys.exit()

setup(
    name='amazon-textract-response-parser',
    packages=['trp', 'a2i'],
    version='0.1.39',
    description='Easily parse JSON returned by Amazon Textract.',
    install_requires=requirements,
    scripts=['bin/amazon-textract-pipeline'],
    long_description_content_type='text/markdown',
    long_description=read('README.md'),
    author='Amazon Rekognition Textract Demoes',
    author_email='rekognition-textract-demos@amazon.com',
    url='https://github.com/aws-samples/amazon-textract-response-parser',
    keywords=
    'amazon-textract-response-parser trp aws amazon textract ocr response parser',
    license="Apache License Version 2.0",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Topic :: Utilities",
        'License :: OSI Approved :: Apache Software License',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
    ],
    python_requires='>=3.6')
