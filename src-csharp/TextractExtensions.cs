using System;
using System.Collections.Generic;

namespace Amazon.Textract.Model {

	public class Word {
		public Word(Block block, List<Block> blocks) {
			this.Block = block;
			this.Confidence = block.Confidence;
			this.Geometry = block.Geometry;
			this.Id = block.Id;
			this.Text = block == null ? string.Empty : block.Text;
		}

		public Block Block { get; set; }
		public float Confidence { get; set; }
		public Geometry Geometry { get; set; }
		public string Id { get; set; }
		public string Text { get; set; }

		public override string ToString() {
			return Text;
		}
	}

	public class TextractDocument {
		private List<Block> blockMap = new List<Block>();
		List<List<Block>> documentPages = new List<List<Block>>();

		public TextractDocument(GetDocumentAnalysisResponse response) {
			this.Pages = new List<Page>();
			this.ResponsePages = new List<GetDocumentAnalysisResponse>();
			this.ResponsePages.Add(response);

			this.ParseDocumentPagesAndBlockMap();
			this.Parse();
		}

		private void ParseDocumentPagesAndBlockMap() {
			List<Block> documentPage = null;
			this.ResponsePages.ForEach(page => {
				page.Blocks.ForEach(block => {
					this.blockMap.Add(block);

					if(block.BlockType == "PAGE") {
						if(documentPage != null) {
							this.documentPages.Add(documentPage);
						}
						documentPage = new List<Block>();
						documentPage.Add(block);
					} else {
						documentPage.Add(block);
					}
				});
			});

			if(documentPage != null) {
				this.documentPages.Add(documentPage);
			}

		}

		private void Parse() {
			this.documentPages.ForEach(documentPage => {
				var page = new Page(documentPage, this.blockMap);
				this.Pages.Add(page);
			});
		}

		public Block GetBlockById(string blockId) {
			return this.blockMap.Find(x => x.Id == blockId);
		}

		public List<GetDocumentAnalysisResponse> ResponsePages { get; set; }
		public List<Page> Pages { get; set; }
		public List<List<Block>> PageBlocks {
			get {
				return this.documentPages;
			}
		}
	}

	public class Table {
		public Table(Block block, List<Block> blocks) {
			this.Block = block;
			this.Confidence = block.Confidence;
			this.Geometry = block.Geometry;
			this.Id = block.Id;
			this.Rows = new List<Row>();
			var ri = 1;
			var row = new Row();

			var relationships = block.Relationships;
			if(relationships != null && relationships.Count > 0) {
				relationships.ForEach(r => {
					if(r.Type == "CHILD") {
						r.Ids.ForEach(id => {
							var cell = new Cell(blocks.Find(b => b.Id == id), blocks);
							if(cell.RowIndex > ri) {
								this.Rows.Add(row);
								row = new Row();
								ri = cell.RowIndex;
							}
							row.Cells.Add(cell);
						});
						if(row != null && row.Cells.Count > 0)
							this.Rows.Add(row);
					}
				});
			}
		}
		public List<Row> Rows { get; set; }
		public Block Block { get; set; }
		public float Confidence { get; set; }
		public Geometry Geometry { get; set; }
		public string Id { get; set; }

		public override string ToString() {
			var result = new List<string>();
			result.Add(string.Format("Table{0}===={0}", Environment.NewLine));
			this.Rows.ForEach(r => {
				result.Add(string.Format("Row{0}===={0}{1}{0}", Environment.NewLine, r));
			});
			return string.Join("", result);
		}
	}

	public class SelectionElement {
		public SelectionElement(Block block, List<Block> blocks) {
			this.Confidence = block.Confidence;
			this.Geometry = block.Geometry;
			this.Id = block.Id;
			this.SelectionStatus = block.SelectionStatus;
		}
		public float Confidence { get; set; }
		public Geometry Geometry { get; set; }
		public string Id { get; set; }
		public string SelectionStatus { get; set; }

	}

	public class Row {
		public Row() {
			this.Cells = new List<Cell>();
		}
		public List<Cell> Cells { get; set; }

		public override string ToString() {
			var result = new List<string>();
			this.Cells.ForEach(c => {
				result.Add(string.Format("[{0}]", c));
			});
			return string.Join("", result);
		}
	}

	public class Page {
		public Page(List<Block> blocks, List<Block> blockMap) {
			this.Blocks = blocks;
			this.Text = string.Empty;
			this.Lines = new List<Line>();
			this.Form = new Form();
			this.Tables = new List<Table>();
			this.Content = new List<dynamic>();

			blocks.ForEach(b => {
				if(b.BlockType == "PAGE") {
					this.Geometry = new NewGeometry(b.Geometry);
					this.Id = b.Id;
				} else if(b.BlockType == "LINE") {
					var l = new Line(b, blockMap);
					this.Lines.Add(l);
					this.Content.Add(l);
					this.Text = this.Text + l.Text + Environment.NewLine;
				} else if(b.BlockType == "TABLE") {
					var t = new Table(b, blockMap);
					this.Tables.Add(t);
					this.Content.Add(t);
				} else if(b.BlockType == "KEY_VALUE_SET") {
					if(b.EntityTypes.Contains("KEY")) {
						var f = new Field(b, blockMap);
						if(f.Key != null) {
							this.Form.AddField(f);
							this.Content.Add(f);
						}
					}
				}
			});

		}

		public List<IndexedText> GetLinesInReadingOrder() {
			var lines = new List<IndexedText>();
			var columns = new List<Column>();
			this.Lines.ForEach(line => {
				var columnFound = false;
				for(var index = 0; index < columns.Count; index++) {
					var column = columns[index];
					var bb = line.Geometry.BoundingBox;
					var bbLeft = bb.Left;
					var bbRight = bb.Left + bb.Width;
					var bbCentre = bb.Left + (bb.Width / 2);
					var columnCentre = column.Left + (column.Right / 2);

					if((bbCentre > column.Left && bbCentre < column.Right) || (columnCentre > bbLeft && columnCentre < bbRight)) {
						lines.Add(new IndexedText { ColumnIndex = index, Text = line.Text });
						columnFound = true;
						break;
					}
				}
				if(!columnFound) {
					var bb = line.Geometry.BoundingBox;
					columns.Add(new Column { Left = bb.Left, Right = bb.Left + bb.Width });
					lines.Add(new IndexedText { ColumnIndex = columns.Count - 1, Text = line.Text });
				}
			});
			lines.FindAll(line => line.ColumnIndex == 0).ForEach(line => Console.WriteLine(line));
			return lines;
		}

		public string GetTextInReadingOrder() {
			var lines = this.GetLinesInReadingOrder();
			var text = string.Empty;
			lines.ForEach(line => {
				text = text + line.Text + "\n";
			});
			return text;
		}


		public List<Block> Blocks { get; set; }
		public string Text { get; set; }
		public List<Line> Lines { get; set; }
		public Form Form { get; set; }
		public List<Table> Tables { get; set; }
		public List<dynamic> Content { get; set; }
		public Geometry Geometry { get; set; }
		public string Id { get; set; }

		public override string ToString() {
			var result = new List<string>();
			result.Add(string.Format("Page{0}===={0}", Environment.NewLine));
			this.Content.ForEach(c => {
				result.Add(string.Format("{1}{0}", Environment.NewLine, c));
			});
			return string.Join("", result);
		}

		public class Column {
			public float Left { get; set; }
			public float Right { get; set; }

			public override string ToString() {
				return string.Format("Left: {0}, Right :{1}", this.Left, this.Right);
			}
		}

		public class IndexedText {
			public int ColumnIndex { get; set; }
			public string Text { get; set; }

			public override string ToString() {
				return string.Format("[{0}] {1}", this.ColumnIndex, this.Text);
			}
		}
	}

	public class NewGeometry : Geometry {

		public NewGeometry(Geometry geometry) : base() {
			this.BoundingBox = geometry.BoundingBox;
			this.Polygon = geometry.Polygon;
			var bb = new NewBoundingBox(this.BoundingBox.Width, this.BoundingBox.Height, this.BoundingBox.Left, this.BoundingBox.Top);
			var pgs = new List<Point>();
			Polygon.ForEach(pg => pgs.Add(new Point {
				X = pg.X,
				Y = pg.Y
			}));

			BoundingBox = bb;
			Polygon = pgs;
		}

		public override string ToString() {
			return string.Format("BoundingBox: {0}{1}", BoundingBox, Environment.NewLine);
		}


	}

	public class NewBoundingBox : BoundingBox {
		public NewBoundingBox(float width, float height, float left, float top) : base() {
			this.Width = width;
			this.Height = height;
			this.Left = left;
			this.Top = top;
		}

		public override string ToString() {
			return string.Format("width: {0}, height: {1}, left: {2}, top: {3}", Width, Height, Left, Top);
		}
	}

	public class Line {
		public Line(Block block, List<Block> blocks) {
			this.Block = block;
			this.Confidence = block.Confidence;
			this.Geometry = block.Geometry;
			this.Id = block.Id;
			this.Text = block == null ? string.Empty : block.Text;
			this.Words = new List<Word>();

			var relationships = block.Relationships;
			if(relationships != null && relationships.Count > 0) {
				relationships.ForEach(r => {
					if(r.Type == "CHILD") {
						r.Ids.ForEach(id => {
							this.Words.Add(new Word(blocks.Find(b => b.BlockType == "WORD" && b.Id == id), blocks));
						});
					}
				});
			}
		}

		public float Confidence { get; set; }
		public Geometry Geometry { get; set; }
		public string Id { get; set; }
		public List<Word> Words { get; set; }
		public string Text { get; set; }
		public Block Block { get; set; }

		public override string ToString() {
			return string.Format(@"
                Line{0}===={0}
                {1} {0}
                Words{0}----{0}
                {2}{0}
                ----
            ", Environment.NewLine, this.Text, string.Join(", ", this.Words));
		}
	}

	public class Form {
		public List<Field> Fields { get; set; }
		private Dictionary<string, Field> fieldMap;

		public Form() {
			this.Fields = new List<Field>();
			this.fieldMap = new Dictionary<string, Field>();
		}

		public void AddField(Field field) {
			this.Fields.Add(field);
			this.fieldMap.Add(field.Key.ToString(), field);
		}
		public Field GetFieldByKey(string key) {
			return this.fieldMap.GetValueOrDefault(key);
		}

		public List<Field> SearchFieldsByKey(string key) {
			return this.Fields.FindAll(f => f.Key.ToString().ToLower().Contains(key.ToLower()));
		}

		public override string ToString() {
			return string.Join("\n", this.Fields);
		}
	}

	public class FieldValue {
		public FieldValue(Block block, List<string> children, List<Block> blocks) {
			this.Block = block;
			this.Confidence = block.Confidence;
			this.Geometry = block.Geometry;
			this.Id = block.Id;
			this.Text = string.Empty;
			this.Content = new List<dynamic>();

			var words = new List<string>();
			if(children != null && children.Count > 0) {
				children.ForEach(c => {
					var wordBlock = blocks.Find(b => b.Id == c);
					if(wordBlock.BlockType == "WORD") {
						var w = new Word(wordBlock, blocks);
						this.Content.Add(w);
						words.Add(w.Text);
					} else if(wordBlock.BlockType == "SELECTION_ELEMENT") {
						var selection = new SelectionElement(wordBlock, blocks);
						this.Content.Add(selection);
						words.Add(selection.SelectionStatus);
					}
				});
			}

			if(words.Count > 0) {
				this.Text = string.Join(" ", words);
			}
		}
		public List<dynamic> Content { get; set; }
		public Block Block { get; set; }
		public float Confidence { get; set; }
		public Geometry Geometry { get; set; }
		public string Id { get; set; }
		public string Text { get; set; }

		public override string ToString() {
			return Text;
		}
	}

	public class FieldKey {
		public FieldKey(Block block, List<string> children, List<Block> blocks) {
			this.Block = block;
			this.Confidence = block.Confidence;
			this.Geometry = block.Geometry;
			this.Id = block.Id;
			this.Text = string.Empty;
			this.Content = new List<dynamic>();

			var words = new List<string>();

			if(children != null && children.Count > 0) {
				children.ForEach(c => {
					var wordBlock = blocks.Find(b => b.Id == c);
					if(wordBlock.BlockType == "WORD") {
						var w = new Word(wordBlock, blocks);
						this.Content.Add(w);
						words.Add(w.Text);
					}
				});
			}

			if(words.Count > 0) {
				this.Text = string.Join(" ", words);
			}

		}
		public List<dynamic> Content { get; set; }
		public Block Block { get; set; }
		public float Confidence { get; set; }
		public Geometry Geometry { get; set; }
		public string Id { get; set; }
		public string Text { get; set; }

		public override string ToString() {
			return Text;
		}
	}

	public class Field {
		public Field(Block block, List<Block> blocks) {
			var relationships = block.Relationships;
			if(relationships != null && relationships.Count > 0) {
				relationships.ForEach(r => {
					if(r.Type == "CHILD") {
						this.Key = new FieldKey(block, r.Ids, blocks);
					} else if(r.Type == "VALUE") {
						r.Ids.ForEach(id => {
							var v = blocks.Find(b => b.Id == id);
							if(v.EntityTypes.Contains("VALUE")) {
								var vr = v.Relationships;
								if(vr != null && vr.Count > 0) {
									vr.ForEach(vc => {
										if(vc.Type == "CHILD") {
											this.Value = new FieldValue(v, vc.Ids, blocks);
										}
									});
								}
							}
						});
					}
				});
			}
		}
		public FieldKey Key { get; set; }
		public FieldValue Value { get; set; }

		public override string ToString() {
			var k = this.Key == null ? string.Empty : this.Key.ToString();
			var v = this.Value == null ? string.Empty : this.Value.ToString();
			return string.Format(@"
                {0}Field{0}===={0}
                Key: {1}, Value: {2}
            ", Environment.NewLine, k, v);
		}
	}

	public class Cell {
		public Cell(Block block, List<Block> blocks) {
			this.Block = block;
			this.ColumnIndex = block.ColumnIndex;
			this.ColumnSpan = block.ColumnSpan;
			this.Confidence = block.Confidence;
			this.Content = new List<dynamic>();
			this.Geometry = block.Geometry;
			this.Id = block.Id;
			this.RowIndex = block.RowIndex;
			this.RowSpan = block.RowSpan;
			this.Text = string.Empty;

			var relationships = block.Relationships;
			if(relationships != null && relationships.Count > 0) {
				relationships.ForEach(r => {
					if(r.Type == "CHILD") {
						r.Ids.ForEach(id => {
							var rb = blocks.Find(b => b.Id == id);
							if(rb.BlockType == "WORD") {
								var w = new Word(rb, blocks);
								this.Content.Add(w);
								this.Text = this.Text + w.Text + " ";
							} else if(rb.BlockType == "SELECTION_ELEMENT") {
								var se = new SelectionElement(rb, blocks);
								this.Content.Add(se);
								this.Text = this.Text + se.SelectionStatus + ", ";
							}
						});
					}

				});
			}
		}
		public int RowIndex { get; set; }
		public int RowSpan { get; set; }
		public int ColumnIndex { get; set; }
		public int ColumnSpan { get; set; }
		public List<dynamic> Content { get; set; }
		public Block Block { get; set; }
		public float Confidence { get; set; }
		public Geometry Geometry { get; set; }
		public string Id { get; set; }
		public string Text { get; set; }

		public override string ToString() {
			return this.Text;
		}
	}
}