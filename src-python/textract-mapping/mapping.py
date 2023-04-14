import json


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
            print("Word AFTER {}".format(w['text']))
            _content.append(w['text'])
            textArr.append(w['text']['text'])

    if textArr:
        _text = ' '.join(textArr)
    return {'block': _block, 'id': _id, 'text': _text, 'content': _content}


def FieldValue(block, children, block_map):
    _block = block
    _id = block['Id']
    _text = ""
    _content = []

    textResults = []

    for eid in children:
        wb = block_map[eid]
        if wb['BlockType'] == "WORD":
            w = WordMapping(wb, block_map)

            print("Word !@#!@#: {}".format(json.dumps(w)))
            _content.append(w['text'])
            textResults.append(w['text']['text'])

    if textResults:
        _text = ' '.join(textResults)
    return {'block': _block, 'id': _id, 'text': _text, 'content': _content}


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


def FieldBuilder(block, block_map):
    _key = None
    _value = None
    for item in block['Relationships']:
        if item["Type"] == "CHILD":
            _key = FieldKey(block, item['Ids'], block_map)
        elif item["Type"] == "VALUE":
            for eid in item['Ids']:
                vkvs = block_map[eid]
                if 'VALUE' in vkvs['EntityTypes']:
                    if 'Relationships' in vkvs:
                        for vitem in vkvs['Relationships']:
                            if vitem["Type"] == "CHILD":
                                _value = FieldValue(vkvs, vitem['Ids'], block_map)

    return {'key': _key, 'value': _value}


def Page(blocks, block_map):
    _tables = None
    _blocks = blocks
    _text = ""
    _lines = []
    _form = Form(block_map)
    _content = []
    _id = 'xxx'

    def parseData(block_map):
        for item in _blocks:
            if item["BlockType"] == "KEY_VALUE_SET":
                if 'KEY' in item['EntityTypes']:
                    field = FieldBuilder(item, block_map)
                    print("new self field ", field, "------ END")
                    if field['key']:
                        _form.addField(field)
                        _content.append(field)
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
        'content': _content
    }

class Document:

    def __init__(self, response_pages):

        if not isinstance(response_pages, list):
            rps = [response_pages]
            response_pages = rps
        self._response_pages = response_pages
        self._pages = []
        self._parse()

    def __str__(self):
        s = "\nDocument\n==========\n"
        for p in self._pages:
            s = s + str(p) + "\n\n"
        return s

    def _parseDocumentPagesAndBlockMap(self):
        block_map = {}

        documentPages = []
        documentPage = []
        for page in self._response_pages:
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

    def _parse(self):

        self._responseDocumentPages, self._block_map = self._parseDocumentPagesAndBlockMap()
        for documentPage in self._responseDocumentPages:
            page = Page(documentPage["blocks"], self._block_map)
            self._pages.append(page)

    @property
    def blocks(self):
        return self._response_pages

    @property
    def pageBlocks(self):
        return self._responseDocumentPages

    @property
    def pages(self):
        return self._pages

    def getBlockById(self, block_id):
        block = None
        if self._block_map and block_id in self._block_map:
            block = self._block_map[block_id]
        return block
