import json


# Create hashmap of word and its location in comparison to the document
class BlockMap:
    def __init__(self, blocks):
        self._map = {}
        for block in blocks:
            self._map[block['Id']] = block

    def getBlock(self, id):
        return self._map[id]

    def getBlocks(self):
        return self._map


class Word:
    def __init__(self, block, block_map):
        self._block = block
        self._id = block['Id']
        self._text = ""
        print("block in FieldValue, {}".format(block))
        if block['Text']:
            block_map[block['Id']]['Text'] = block['Text']
            self._text = block['Text']

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
    def __init__(self, block, children, block_map):
        self._block = block
        self._id = block['Id']
        self._text = ""
        self._content = []

        t = []

        for eid in children:
            wb = block_map[eid]
            if wb['BlockType'] == "WORD":
                w = Word(wb, block_map)
                self._content.append(w)
                t.append(w.text)

        if t:
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
    def __init__(self, block, children, block_map):
        self._block = block
        self._id = block['Id']
        self._text = ""
        self._content = []

        t = []

        for eid in children:
            wb = block_map[eid]
            if wb['BlockType'] == "WORD":
                w = Word(wb, block_map)
                self._content.append(w)
                t.append(w.text)

        if t:
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
    def __init__(self, block, block_map):
        self._key = None
        self._value = None
        for item in block['Relationships']:
            if item["Type"] == "CHILD":
                self._key = FieldKey(block, item['Ids'], block_map)
            elif item["Type"] == "VALUE":
                for eid in item['Ids']:
                    vkvs = block_map[eid]
                    if 'VALUE' in vkvs['EntityTypes']:
                        if 'Relationships' in vkvs:
                            for vitem in vkvs['Relationships']:
                                if vitem["Type"] == "CHILD":
                                    self._value = FieldValue(vkvs, vitem['Ids'], block_map)

    def __str__(self):
        s = "\nField\n==========\n"
        k = ""
        v = ""
        if self._key:
            k = str(self._key)
        if self._value:
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
        if key in self._fieldsMap:
            field = self._fieldsMap[key]
        return field

    def searchFieldsByKey(self, key):
        searchKey = key.lower()
        results = []
        for field in self._fields:
            if field.key and searchKey in field.key.text.lower():
                results.append(field)
        return results


class Page:

    def __init__(self, blocks, block_map):
        self._tables = None
        self._blocks = blocks
        self._text = ""
        self._lines = []
        self._form = Form()
        self._content = []
        self._id = 'xxx'
        self._parse(block_map)

    def __str__(self):
        s = "Page\n==========\n"
        for item in self._content:
            s = s + str(item) + "\n"
        return s

    def _parse(self, block_map):
        for item in self._blocks:
            if item["BlockType"] == "KEY_VALUE_SET":
                print('item, {}'.format(item))
                if 'KEY' in item['EntityTypes']:
                    f = Field(item, block_map)
                    if f.key:
                        self._form.addField(f)
                        self._content.append(f)
                    # else:
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
            # print("page id {}".format(page))
            for block in page['Blocks']:
                # print("block id {}".format(block))
                if 'BlockType' in block and 'Id' in block:
                    # print("block id valid - {}".format(block['Id']))
                    block_map[block['Id']] = block

                if block['BlockType'] == 'PAGE':
                    # print("block Type is page - {}".format(block['BlockType']))

                    if documentPage:
                        documentPages.append({"blocks": documentPage})
                    documentPage = [block]
                else:

                    documentPage.append(block)
        if documentPage:
            documentPages.append({"blocks": documentPage})
        print('BLOCK_MAP values {}'
              .format(block_map.values()))
        print('BLOCK_MAP keys {}'.format(block_map.keys()))
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
