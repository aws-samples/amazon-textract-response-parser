import json

class Word:
    def __init__(self, block, blockMap):
        self._block = block
        self._id = block['id']
        self._text = ""
        if(block['text']):
            self._text = block['text']

    def __str__(self):
        return self._text

    @property
    def id(self):
        return self._id

    @property
    def text(self):
        return self._text

    @property
    def block(self):
        return self._block

class FieldKey:
    def __init__(self, block, children, blockMap):
        self._block = block
        self._id = block['id']
        self._text = ""
        self._content = []

        t = []

        for eid in children:
            wb = blockMap[eid]
            if(wb['blockType'] == "WORD"):
                w = Word(wb, blockMap)
                self._content.append(w)
                t.append(w.text)

        if(t):
            self._text = ' '.join(t)

    def __str__(self):
        return self._text

    @property
    def id(self):
        return self._id

    @property
    def content(self):
        return self._content

    @property
    def text(self):
        return self._text

    @property
    def block(self):
        return self._block

class FieldValue:
    def __init__(self, block, children, blockMap):
        self._block = block
        self._id = block['id']
        self._text = ""
        self._content = []

        t = []

        for eid in children:
            wb = blockMap[eid]
            if(wb['blockType'] == "WORD"):
                w = Word(wb, blockMap)
                self._content.append(w)
                t.append(w.text)
 
        if(t):
            self._text = ' '.join(t)

    def __str__(self):
        return self._text

    @property
    def id(self):
        return self._id

    @property
    def content(self):
        return self._content

    @property
    def text(self):
        return self._text
    
    @property
    def block(self):
        return self._block

class Field:
    def __init__(self, block, blockMap):
        self._key = None
        self._value = None

        for item in block['relationships']:
            if(item["type"] == "CHILD"):
                self._key = FieldKey(block, item['ids'], blockMap)
            elif(item["type"] == "VALUE"):
                for eid in item['ids']:
                    vkvs = blockMap[eid]
                    if 'VALUE' in vkvs['entityTypes']:
                        if('relationships' in vkvs):
                            for vitem in vkvs['relationships']:
                                if(vitem["type"] == "CHILD"):
                                    self._value = FieldValue(vkvs, vitem['ids'], blockMap)
    def __str__(self):
        s = "\nField\n==========\n"
        k = ""
        v = ""
        if(self._key):
            k = str(self._key)
        if(self._value):
            v = str(self._value)
        s = s + "Key: {}\nValue: {}".format(k, v)
        return s

    @property
    def key(self):
        return self._key

    @property
    def value(self):
        return self._value

class Form:
    def __init__(self):
        self._fields = []
        self._fieldsMap = {}

    def addField(self, field):
        self._fields.append(field)
        self._fieldsMap[field.key.text] = field

    def __str__(self):
        s = ""
        for field in self._fields:
            s = s + str(field) + "\n"
        return s

    @property
    def fields(self):
        return self._fields

    def getFieldByKey(self, key):
        field = None
        if(key in self._fieldsMap):
            field = self._fieldsMap[key]
        return field
    
    def searchFieldsByKey(self, key):
        searchKey = key.lower()
        results = []
        for field in self._fields:
            if(field.key and searchKey in field.key.text.lower()):
                results.append(field)
        return results

class Page:

    def __init__(self, blocks, blockMap):
        self._blocks = blocks
        self._text = ""
        self._lines = []
        self._form = Form()
        self._content = []
        self._id = 'xxx'
        self._parse(blockMap)

    def __str__(self):
        s = "Page\n==========\n"
        for item in self._content:
            s = s + str(item) + "\n"
        return s

    def _parse(self, blockMap):
        for item in self._blocks:
            if item["blockType"] == "KEY_VALUE_SET":
                if 'KEY' in item['entityTypes']:
                    f = Field(item, blockMap)
                    if(f.key):
                        self._form.addField(f)
                        self._content.append(f)
                    #else:
                    #    print("WARNING: Detected K/V where key does not have content. Excluding key from output.")
                    #    print(f)
                    #    print(item)

    @property
    def blocks(self):
        return self._blocks

    @property
    def text(self):
        return self._text

    @property
    def lines(self):
        return self._lines

    @property
    def form(self):
        return self._form

    @property
    def tables(self):
        return self._tables

    @property
    def content(self):
        return self._content

    @property
    def id(self):
        return self._id

class Document:

    def __init__(self, responsePages):

        if(not isinstance(responsePages, list)):
            rps = []
            rps.append(responsePages)
            responsePages = rps

        self._responsePages = responsePages
        self._pages = []

        self._parse()

    def __str__(self):
        s = "\nDocument\n==========\n"
        for p in self._pages:
            s = s + str(p) + "\n\n"
        return s

    def _parseDocumentPagesAndBlockMap(self):

        blockMap = {}

        documentPages = []
        documentPage = []
        for page in self._responsePages:
            print("page id {}".format(page))
            for block in page['blocks']:
                if('blockType' in block and 'id' in block):
                    blockMap[block['id']] = block

                if(block['blockType'] == 'PAGE'):
                    if(documentPage):
                        documentPages.append({"blocks" : documentPage})
                    documentPage = []
                    documentPage.append(block)
                else:

                    documentPage.append(block)
        if(documentPage):
            documentPages.append({"blocks" : documentPage})
        return documentPages, blockMap

    def _parse(self):

        self._responseDocumentPages, self._blockMap = self._parseDocumentPagesAndBlockMap()
        for documentPage in self._responseDocumentPages:
            page = Page(documentPage["blocks"], self._blockMap)
            self._pages.append(page)

    @property
    def blocks(self):
        return self._responsePages

    @property
    def pageBlocks(self):
        return self._responseDocumentPages

    @property
    def pages(self):
        return self._pages

    def getBlockById(self, blockId):
        block = None
        if(self._blockMap and blockId in self._blockMap):
            block = self._blockMap[blockId]
        return block

