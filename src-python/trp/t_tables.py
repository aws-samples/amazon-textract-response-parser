import logging
import trp.trp2 as t2
from typing import List
from trp.trp2 import TDocument, TDocumentSchema
from trp.t_pipeline import order_blocks_by_geo
import trp

logger = logging.getLogger(__name__)

def __validate_objects_between_tables(page1, page1_table, page2, page2_table, header_type, footer_type):
    """
    Step 1: Check if there is any lines between the first and second table except in the Footer and Header area
    """
    header_map = {'NONE': 0, 'NARROW':0.5, 'NORMAL':1}
    header_height = header_map[header_type]/11
    footer_height = header_map[footer_type]/11
    
    # Validate table 1 with first page footer
    table1_end_y = page1_table.geometry.polygon[2].y
    if any(1-footer_height > line.geometry.polygon[2].y > table1_end_y for line in page1.lines):
        print('::Validation 1:: False | Not a continuous table, lines exist below table 1 ID:', page1_table.id)
        return False
    # Validate table 2 with second page header
    table2_start_y = page2_table.geometry.boundingBox.top
    if any(header_height < line.geometry.boundingBox.top < table2_start_y for line in page2.lines):
        print('::Validation 1:: False | Not a continuous table, lines exist above table 2 ID:', page2_table.id)
        return False
    print('::Validation 1:: True | No lines exist between the two tables')
    return True

def __compare_table_column_numbers(table_1, table_2):
    """
    Step 2_1: Comparing number of columns on each table
    """
    print('Table 1 ID: ', table_1.id, '\t Table 2 ID:', table_2.id)
    table1_col_num = len(table_1.rows[0].cells)
    table2_col_num = len(table_2.rows[0].cells)
    if table1_col_num == table2_col_num:
        print('::Validation 2_1:: True | Table 1 (' + str(table1_col_num) + ') & Table 2 (' + str(table2_col_num) + ') have similar number of columns:' + str (table1_col_num))
        return True
    else:
        print('::Validation 2_1:: False | Table 1 (' + str(table1_col_num) + ') & Table 2 (' + str(table2_col_num) + ') have different number of columns')
        return False

def __compare_table_headers(table_1, table_2):
    """
    Step 2_2: Comparing table header (first row) values on each table
    """
    col_num = len(table_1.rows[0].cells)
    for i in range(0,col_num-1):
        if table_1.rows[0].cells[i] != table_2.rows[0].cells[i]:
            print('::Validation 2_2 :: False | Table:', table_1.id, 'and Table:', table_2.id, 'have different first rows.')
            return False
    print('::Validation 2_2 :: True | Table:', table_1.id, 'and Table:', table_2.id, 'have similar first rows.')
    return True

def __calculate_percentage_difference(measure_1, measure_2):
    """
    Percentage difference calculation
    """
    try:
        return round(abs(100*(measure_1-measure_2)/((measure_1+measure_2)/2)),3)
    except ZeroDivisionError:
        return 0

def __compare_table_dimensions(table_1, table_2, accuracy_percentage):
    """
    Step 3: Validate table bounding boxes to check left and right margin positions
    """
    width_difference = __calculate_percentage_difference(table_1.geometry.boundingBox.width, table_2.geometry.boundingBox.width)
    left_difference = __calculate_percentage_difference(table_1.geometry.boundingBox.left, table_2.geometry.boundingBox.left)
    if width_difference<(100-float(accuracy_percentage)) and left_difference<(100-float(accuracy_percentage)):
        return True
    return False

def ExecuteTableValidations(t_doc, header_footer_type, accuracy_percentage):
    """
    Invoke validations for first and last tables on all pages recursively
    """
    page_compare_proc = 0
    table_ids_to_merge = {}
    table_ids_merge_list = []
    
    ordered_doc = order_blocks_by_geo(t_doc)
    trp_doc = trp.Document(TDocumentSchema().dump(ordered_doc))

    for current_page in trp_doc.pages:
        if(page_compare_proc >= len(trp_doc.pages)-1):
            break
        if(len(current_page.tables) == 0 or len(current_page.tables) == 0):
            page_compare_proc += 1
            break
        current_page_table = current_page.tables[len(current_page.tables)-1]
        next_page = trp_doc.pages[page_compare_proc+1]
        next_page_table = next_page.tables[0]
        result_1 = __validate_objects_between_tables(current_page, current_page_table, next_page, next_page_table, header_footer_type, header_footer_type)
        if(result_1):
            result_2_1 = __compare_table_column_numbers(current_page_table, next_page_table)
            result_2_2 = __compare_table_headers(current_page_table, next_page_table)
            if(result_2_1 or result_2_2):
                result3 = __compare_table_dimensions(current_page_table, next_page_table, accuracy_percentage)
                table_ids_to_merge[next_page_table.id] = current_page_table.id
                if(table_ids_merge_list):
                    if(any(merge_pairs[1] == current_page_table.id for merge_pairs in table_ids_merge_list)):
                        table_ids_merge_list[len(table_ids_merge_list)-1].append(next_page_table.id)
                else:
                    table_ids_merge_list.append([current_page_table.id,next_page_table.id])
        page_compare_proc += 1
    return table_ids_merge_list