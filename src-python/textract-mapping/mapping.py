def Document(response_pages):
    if not isinstance(response_pages, list):
        rps = [response_pages]
        response_pages = rps
    _wordsObjects = []
    _words = []

    for page in response_pages:
        for block in page['Blocks']:
            if 'BlockType' in block and block['BlockType'] == 'WORD':
                _wordsObjects.append(block)
                _words.append(block['Text'])

    return {'wordsObjects': _wordsObjects, 'words': _words}
