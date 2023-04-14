import json


class Form:
    def __init__(self, block_map):
        self._fields = []
        self._fieldsMap = {}
        self._block_map = block_map

    def addField(self, field):
        self._fields.append(field)
        self._fieldsMap[field['key']['text']] = field

    @property
    def fields(self):
        return self._fields

    def getFieldByKey(self, key):
        field = None
        if key in self._fieldsMap:
            field = self._fieldsMap[key]
        return field

    def searchFieldsByKey(self, key):
        searchKey = key.lower()
        results = []
        for field in self._fields:
            if field['key'] and searchKey in field['key']['text'].lower():
                results.append(field)
        return results


def WordMapping(block, block_map):
    _block = block
    _id = block['Id']
    _text = ""
    if block['Text']:
        customWordValue = {'text': block['Text'], 'geometry': block['Geometry'], 'id': block['Id']}
        block_map[block['Id']]['Text'] = customWordValue
        _text = block['Text']
    return {'block': _block, 'id': _id, 'text': _text}


def FieldKey(block, children, block_map):
    _block = block
    _id = block['Id']
    _text = ""
    _content = []
    textArr = []

    for eid in children:
        wb = block_map[eid]
        if wb['BlockType'] == "WORD":
            w = WordMapping(wb, block_map)
            _content.append(w['text'])
            textArr.append(w['text']['text'])

    if textArr:
        _text = ' '.join(textArr)
    return {'block': _block, 'id': _id, 'text': _text, 'content': _content}


def FieldValue(block, children, block_map):
    _block = block
    _id = block['Id']
    _text = ""
    customWordMapping = []

    textResults = []

    for eid in children:
        wb = block_map[eid]
        if wb['BlockType'] == "WORD":
            w = WordMapping(wb, block_map)
            customWordMapping.append(w['text'])
            textResults.append(w['text']['text'])

    if textResults:
        _text = ' '.join(textResults)
    return {'block': _block, 'id': _id, 'text': _text, 'content': customWordMapping}


def IterateItemIds(item, block_map):
    for eid in item['Ids']:
        block_map_eid = block_map[eid]
        if 'VALUE' in block_map_eid['EntityTypes']:
            if 'Relationships' in block_map_eid:
                for vkvs_relationships in block_map_eid['Relationships']:
                    if vkvs_relationships["Type"] == "CHILD":
                        return FieldValue(block_map_eid, vkvs_relationships['Ids'], block_map)
                    else:
                        print("ERROR: Missing Type in vkvs_relationships")
                        return None
            else:
                print("ERROR: Missing Relationships in VKS")
                return None
        else:
            print("ERROR: Missing Value in EntityTypes")
            return None


def FieldBuilder(block, block_map):
    _key = None
    _value = None
    for item in block['Relationships']:
        if item["Type"] == "CHILD":
            _key = FieldKey(block, item['Ids'], block_map)
        elif item["Type"] == "VALUE":
            _value = IterateItemIds(item, block_map)
    return {'key': _key, 'value': _value}


def Page(blocks, block_map):
    _tables = None
    _blocks = blocks
    _text = ""
    _lines = []
    _form = Form(block_map)
    _word_mapping = []
    _id = 'xxx'

    def parseData(block_map_params):
        for item in _blocks:
            if item["BlockType"] == "KEY_VALUE_SET":
                if 'KEY' in item['EntityTypes']:
                    field = FieldBuilder(item, block_map_params)
                    if field['key']:
                        _form.addField(field)
                        _word_mapping.append(field)
                    else:
                        print("WARNING: Detected K/V where key does not have content. Excluding key from output.")
                        print(field)
                        print(item)

    parseData(block_map)
    return {
        'id': _id,
        'blocks': _blocks,
        'text': _text,
        'lines': _lines,
        'form': _form,
        'word_mapping': _word_mapping
    }


def Document(response_pages):
    if not isinstance(response_pages, list):
        rps = [response_pages]
        response_pages = rps
    _response_pages = response_pages
    _pages = []
    _page_blocks = []

    def _parseDocumentPagesAndBlockMap():
        block_map = {}
        documentPages = []
        documentPage = []
        for page in _response_pages:
            for block in page['Blocks']:
                if 'BlockType' in block and 'Id' in block:
                    block_map[block['Id']] = block

                if block['BlockType'] == 'PAGE':
                    if documentPage:
                        documentPages.append({"blocks": documentPage})
                    documentPage = [block]
                else:
                    documentPage.append(block)

        if documentPage:
            documentPages.append({"blocks": documentPage})
        return documentPages, block_map

    def _parse():
        _responseDocumentPages, _block_map = _parseDocumentPagesAndBlockMap()
        for documentPage in _responseDocumentPages:
            page = Page(documentPage["blocks"], _block_map)
            _pages.append(page)
        return _responseDocumentPages

    _page_blocks = _parse()

    return {'blocks': _response_pages, 'pageBlocks': _page_blocks, 'pages': _pages}
