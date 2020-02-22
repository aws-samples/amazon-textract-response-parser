require 'aws-sdk-textract'

class AwsTextractParser
   attr_reader :filename, :bucket

   def initialize(filename, bucket)
     @filename = filename
     @bucket = bucket
   end

   def parse
     {
       kv: parse_key_value_pairs,
       lines: parse_lines
     }
   end

   def parse_key_value_pairs
     key_value_pairs = {}
     key_map, value_map, block_map = get_kv_map
     kvs = get_kv_relationship(key_map, value_map, block_map)
     kvs.each do |key, value|
       key_value_pairs[key] = value
     end
     key_value_pairs
   end

  def parse_lines
    lines = []
    response.blocks.each do |block|
      if block.block_type == "LINE"
        lines << block.text
      end
    end
    lines
  end

  def response
    client = Aws::Textract::Client.new
    @response ||= client.analyze_document({ document: {s3_object: {bucket: bucket, name: filename}}, feature_types: ["FORMS", "TABLES"]})
  end


   def get_kv_map
     blocks = response.blocks
     key_map = {}
     value_map = {}
     block_map = {}
     blocks.each do |block|

       block_id = block.id
       block_map[block_id] = block
       if block.block_type == "KEY_VALUE_SET"
         if  block.entity_types.include?('KEY')
           key_map[block_id] = block
         else
           value_map[block_id] = block
         end
       end
     end
     [key_map, value_map, block_map]
   end


   def get_kv_relationship(key_map, value_map, block_map)
     kvs = {}
     key_map.each do |_block_id, key_block|
       value_block = find_value_block(key_block, value_map)
       key = get_text(key_block, block_map)
       val = get_text(value_block, block_map)
       kvs[key] = val
     end
     kvs
   end


   def find_value_block(key_block, value_map)
     value_block = []
     key_block.relationships.each do |relationship|
       if relationship.type == 'VALUE'
         relationship.ids.each do |value_id|
           value_block = value_map[value_id]
         end
       end
     end
     value_block
   end

   def get_text(result, blocks_map)
     text = ''

     return if result.relationships.nil?

     result.relationships.each do |relationship|
       if relationship.type == 'CHILD'
         relationship.ids.each do |child_id|
           word = blocks_map[child_id]
           if word.block_type == 'WORD'
             text += word.text + ' '
           end

           if word.block_type == 'SELECTION_ELEMENT'
             if word.selection_status == 'SELECTED'
               text += 'X '
             end
           end
         end
       end
     end
     text
   end
end
